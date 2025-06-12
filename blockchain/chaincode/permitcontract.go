package chaincode

import (
    "encoding/json"
    "fmt"
    "time"

    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Permit represents a permit in the system
type Permit struct {
    ID              string    `json:"id"`
    ApplicantName   string    `json:"applicantName"`
    ProjectAddress  string    `json:"projectAddress"`
    PermitType      string    `json:"permitType"`
    Status          string    `json:"status"`
    SubmissionDate  time.Time `json:"submissionDate"`
    ApprovalDate    time.Time `json:"approvalDate,omitempty"`
    Documents       []string  `json:"documents"`
    Checklist       Checklist `json:"checklist"`
    TransactionHash string    `json:"transactionHash"`
}

// Checklist represents the requirements for a permit
type Checklist struct {
    CutSheetsSubmitted    bool `json:"cutSheetsSubmitted"`
    BDAPhotosSubmitted    bool `json:"bdaPhotosSubmitted"`
    RFSurveySubmitted     bool `json:"rfSurveySubmitted"`
    RedlinesSubmitted     bool `json:"redlinesSubmitted"`
    AllRequirementsMet    bool `json:"allRequirementsMet"`
}

// SmartContract provides functions for managing permits
type SmartContract struct {
    contractapi.Contract
}

// CreatePermit creates a new permit
func (s *SmartContract) CreatePermit(ctx contractapi.TransactionContextInterface, id string, applicantName string, projectAddress string, permitType string) error {
    exists, err := s.PermitExists(ctx, id)
    if err != nil {
        return err
    }
    if exists {
        return fmt.Errorf("permit %s already exists", id)
    }

    permit := Permit{
        ID:             id,
        ApplicantName:  applicantName,
        ProjectAddress: projectAddress,
        PermitType:     permitType,
        Status:         "SUBMITTED",
        SubmissionDate: time.Now(),
        Documents:      []string{},
        Checklist: Checklist{
            CutSheetsSubmitted: false,
            BDAPhotosSubmitted: false,
            RFSurveySubmitted:  false,
            RedlinesSubmitted:  false,
            AllRequirementsMet: false,
        },
        TransactionHash: ctx.GetStub().GetTxID(),
    }

    permitJSON, err := json.Marshal(permit)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState(id, permitJSON)
}

// GetPermit returns the permit stored in the world state with given id
func (s *SmartContract) GetPermit(ctx contractapi.TransactionContextInterface, id string) (*Permit, error) {
    permitJSON, err := ctx.GetStub().GetState(id)
    if err != nil {
        return nil, fmt.Errorf("failed to read from world state: %v", err)
    }
    if permitJSON == nil {
        return nil, fmt.Errorf("permit %s does not exist", id)
    }

    var permit Permit
    err = json.Unmarshal(permitJSON, &permit)
    if err != nil {
        return nil, err
    }

    return &permit, nil
}

// UpdatePermitStatus updates the status of a permit
func (s *SmartContract) UpdatePermitStatus(ctx contractapi.TransactionContextInterface, id string, status string) error {
    permit, err := s.GetPermit(ctx, id)
    if err != nil {
        return err
    }

    permit.Status = status
    if status == "APPROVED" {
        permit.ApprovalDate = time.Now()
    }
    permit.TransactionHash = ctx.GetStub().GetTxID()

    permitJSON, err := json.Marshal(permit)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState(id, permitJSON)
}

// AddDocument adds a document to a permit
func (s *SmartContract) AddDocument(ctx contractapi.TransactionContextInterface, id string, documentHash string) error {
    permit, err := s.GetPermit(ctx, id)
    if err != nil {
        return err
    }

    permit.Documents = append(permit.Documents, documentHash)
    permit.TransactionHash = ctx.GetStub().GetTxID()

    permitJSON, err := json.Marshal(permit)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState(id, permitJSON)
}

// UpdateChecklist updates the checklist for a permit
func (s *SmartContract) UpdateChecklist(ctx contractapi.TransactionContextInterface, id string, checklist Checklist) error {
    permit, err := s.GetPermit(ctx, id)
    if err != nil {
        return err
    }

    permit.Checklist = checklist
    permit.TransactionHash = ctx.GetStub().GetTxID()

    permitJSON, err := json.Marshal(permit)
    if err != nil {
        return err
    }

    return ctx.GetStub().PutState(id, permitJSON)
}

// PermitExists returns true when permit with given ID exists in world state
func (s *SmartContract) PermitExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
    permitJSON, err := ctx.GetStub().GetState(id)
    if err != nil {
        return false, fmt.Errorf("failed to read from world state: %v", err)
    }

    return permitJSON != nil, nil
}

// GetAllPermits returns all permits found in world state
func (s *SmartContract) GetAllPermits(ctx contractapi.TransactionContextInterface) ([]*Permit, error) {
    startKey := ""
    endKey := ""

    resultsIterator, err := ctx.GetStub().GetStateByRange(startKey, endKey)
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

// GetPermitsByStatus returns all permits with the given status
func (s *SmartContract) GetPermitsByStatus(ctx contractapi.TransactionContextInterface, status string) ([]*Permit, error) {
    queryString := fmt.Sprintf(`{"selector":{"status":"%s"}}`, status)
    return s.queryPermits(ctx, queryString)
}

// GetPermitsByApplicant returns all permits for a given applicant
func (s *SmartContract) GetPermitsByApplicant(ctx contractapi.TransactionContextInterface, applicantName string) ([]*Permit, error) {
    queryString := fmt.Sprintf(`{"selector":{"applicantName":"%s"}}`, applicantName)
    return s.queryPermits(ctx, queryString)
}

// queryPermits executes a query and returns all permits that match
func (s *SmartContract) queryPermits(ctx contractapi.TransactionContextInterface, queryString string) ([]*Permit, error) {
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