package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type PermitContract struct {
	contractapi.Contract
}

type Permit struct {
	PermitID     string     `json:"permitId"`
	FileHashes   []FileHash `json:"fileHashes"`
	Status       string     `json:"status"`
	CreatedBy    string     `json:"createdBy"`
	CreatedAt    string     `json:"createdAt"`
	UpdatedBy    string     `json:"updatedBy"`
	UpdatedAt    string     `json:"updatedAt"`
	Organization string     `json:"organization"`
}

type FileHash struct {
	Filename string `json:"filename"`
	SHA256   string `json:"sha256"`
	Uploader string `json:"uploader"`
	UploadedAt string `json:"uploadedAt"`
}

const (
	StatusSubmitted = "SUBMITTED"
	StatusUnderReview = "UNDER_REVIEW"
	StatusApproved = "APPROVED"
	StatusRejected = "REJECTED"
	StatusExpired = "EXPIRED"
)

var validStatusTransitions = map[string][]string{
	StatusSubmitted: {StatusUnderReview, StatusRejected},
	StatusUnderReview: {StatusApproved, StatusRejected},
	StatusApproved: {StatusExpired},
	StatusRejected: {StatusSubmitted},
	StatusExpired: {StatusSubmitted},
}

func (pc *PermitContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

func (pc *PermitContract) CreatePermit(ctx contractapi.TransactionContextInterface, permitId, organization string) error {
	// Check if permit already exists
	exists, err := pc.PermitExists(ctx, permitId)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("permit %s already exists", permitId)
	}

	// Get client identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Create new permit
	permit := Permit{
		PermitID:     permitId,
		FileHashes:   []FileHash{},
		Status:       StatusSubmitted,
		CreatedBy:    clientID,
		CreatedAt:    ctx.GetStub().GetTxTimestamp().String(),
		UpdatedBy:    clientID,
		UpdatedAt:    ctx.GetStub().GetTxTimestamp().String(),
		Organization: organization,
	}

	permitJSON, err := json.Marshal(permit)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(permitId, permitJSON)
}

func (pc *PermitContract) LogFileHash(ctx contractapi.TransactionContextInterface, permitId, filename, sha256 string) error {
	// Get client identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Get permit
	permitJSON, err := ctx.GetStub().GetState(permitId)
	if err != nil {
		return fmt.Errorf("failed to read permit: %v", err)
	}
	if permitJSON == nil {
		return fmt.Errorf("permit %s does not exist", permitId)
	}

	var permit Permit
	err = json.Unmarshal(permitJSON, &permit)
	if err != nil {
		return err
	}

	// Check if user has permission to upload files
	if !pc.hasPermission(ctx, permit.Organization) {
		return fmt.Errorf("user does not have permission to upload files for this permit")
	}

	// Add file hash
	permit.FileHashes = append(permit.FileHashes, FileHash{
		Filename:   filename,
		SHA256:     sha256,
		Uploader:   clientID,
		UploadedAt: ctx.GetStub().GetTxTimestamp().String(),
	})

	// Update permit
	permit.UpdatedBy = clientID
	permit.UpdatedAt = ctx.GetStub().GetTxTimestamp().String()

	updated, err := json.Marshal(permit)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(permitId, updated)
}

func (pc *PermitContract) UpdateStatus(ctx contractapi.TransactionContextInterface, permitId, newStatus string) error {
	// Get client identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Get permit
	permitJSON, err := ctx.GetStub().GetState(permitId)
	if err != nil {
		return fmt.Errorf("failed to read permit: %v", err)
	}
	if permitJSON == nil {
		return fmt.Errorf("permit %s does not exist", permitId)
	}

	var permit Permit
	err = json.Unmarshal(permitJSON, &permit)
	if err != nil {
		return err
	}

	// Validate status transition
	if !pc.isValidStatusTransition(permit.Status, newStatus) {
		return fmt.Errorf("invalid status transition from %s to %s", permit.Status, newStatus)
	}

	// Check if user has permission to update status
	if !pc.hasPermission(ctx, permit.Organization) {
		return fmt.Errorf("user does not have permission to update status for this permit")
	}

	// Update status
	permit.Status = newStatus
	permit.UpdatedBy = clientID
	permit.UpdatedAt = ctx.GetStub().GetTxTimestamp().String()

	updated, err := json.Marshal(permit)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(permitId, updated)
}

func (pc *PermitContract) GetPermitById(ctx contractapi.TransactionContextInterface, permitId string) (*Permit, error) {
	permitJSON, err := ctx.GetStub().GetState(permitId)
	if err != nil {
		return nil, fmt.Errorf("failed to read permit: %v", err)
	}
	if permitJSON == nil {
		return nil, fmt.Errorf("permit %s does not exist", permitId)
	}

	var permit Permit
	err = json.Unmarshal(permitJSON, &permit)
	if err != nil {
		return nil, err
	}

	return &permit, nil
}

func (pc *PermitContract) GetPermitsByStatus(ctx contractapi.TransactionContextInterface, status string) ([]*Permit, error) {
	// Validate status
	if !pc.isValidStatus(status) {
		return nil, fmt.Errorf("invalid status: %s", status)
	}

	// Create query
	queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var permits []*Permit
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var permit Permit
		err = json.Unmarshal(queryResult.Value, &permit)
		if err != nil {
			return nil, err
		}
		permits = append(permits, &permit)
	}

	return permits, nil
}

func (pc *PermitContract) GetPermitsByOrganization(ctx contractapi.TransactionContextInterface, organization string) ([]*Permit, error) {
	// Create query
	queryString := fmt.Sprintf(`{"selector":{"organization":"%s"}}`, organization)
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var permits []*Permit
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var permit Permit
		err = json.Unmarshal(queryResult.Value, &permit)
		if err != nil {
			return nil, err
		}
		permits = append(permits, &permit)
	}

	return permits, nil
}

func (pc *PermitContract) GetPermitHistory(ctx contractapi.TransactionContextInterface, permitId string) ([]*Permit, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(permitId)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var history []*Permit
	for resultsIterator.HasNext() {
		mod, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		var permit Permit
		err = json.Unmarshal(mod.Value, &permit)
		if err == nil {
			history = append(history, &permit)
		}
	}
	return history, nil
}

// Helper functions
func (pc *PermitContract) PermitExists(ctx contractapi.TransactionContextInterface, permitId string) (bool, error) {
	permitJSON, err := ctx.GetStub().GetState(permitId)
	if err != nil {
		return false, fmt.Errorf("failed to read permit: %v", err)
	}
	return permitJSON != nil, nil
}

func (pc *PermitContract) isValidStatus(status string) bool {
	switch status {
	case StatusSubmitted, StatusUnderReview, StatusApproved, StatusRejected, StatusExpired:
		return true
	default:
		return false
	}
}

func (pc *PermitContract) isValidStatusTransition(currentStatus, newStatus string) bool {
	validTransitions, exists := validStatusTransitions[currentStatus]
	if !exists {
		return false
	}
	for _, validStatus := range validTransitions {
		if validStatus == newStatus {
			return true
		}
	}
	return false
}

func (pc *PermitContract) hasPermission(ctx contractapi.TransactionContextInterface, organization string) bool {
	// Get client identity
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return false
	}

	// Get client's organization from identity
	clientOrg := strings.Split(clientID, "@")[1]
	
	// Check if client belongs to the organization
	return clientOrg == organization
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(PermitContract))
	if err != nil {
		panic(err.Error())
	}
	if err := chaincode.Start(); err != nil {
		panic(err.Error())
	}
} 