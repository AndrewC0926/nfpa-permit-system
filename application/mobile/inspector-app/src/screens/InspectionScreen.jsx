import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';

const InspectionScreen = ({ route, navigation }) => {
    const { permitId } = route.params;
    const [permit, setPermit] = useState(null);
    const [inspection, setInspection] = useState({
        findings: [],
        photos: [],
        notes: '',
        status: 'IN_PROGRESS'
    });
    const [location, setLocation] = useState(null);

    useEffect(() => {
        loadPermitDetails();
        getCurrentLocation();
    }, []);

    const loadPermitDetails = async () => {
        try {
            const response = await fetch(`/api/permits/${permitId}`);
            const data = await response.json();
            setPermit(data);
        } catch (error) {
            console.error('Failed to load permit:', error);
        }
    };

    const getCurrentLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location);
        } catch (error) {
            console.error('Failed to get location:', error);
        }
    };

    const takePhoto = async () => {
        try {
            const { status } = await Camera.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access camera was denied');
                return;
            }

            // Launch camera and capture photo
            const result = await Camera.launchCameraAsync({
                mediaTypes: Camera.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.cancelled) {
                setInspection(prev => ({
                    ...prev,
                    photos: [...prev.photos, {
                        uri: result.uri,
                        timestamp: new Date().toISOString(),
                        location: location
                    }]
                }));
            }
        } catch (error) {
            console.error('Failed to take photo:', error);
        }
    };

    const addFinding = (finding) => {
        setInspection(prev => ({
            ...prev,
            findings: [...prev.findings, {
                id: Date.now(),
                ...finding,
                timestamp: new Date().toISOString(),
                location: location
            }]
        }));
    };

    const completeInspection = async () => {
        try {
            const inspectionData = {
                ...inspection,
                permitId,
                inspectorId: 'current-inspector-id',
                completedAt: new Date().toISOString(),
                location: location
            };

            const response = await fetch(`/api/permits/${permitId}/inspections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inspectionData),
            });

            if (response.ok) {
                alert('Inspection completed successfully!');
                navigation.goBack();
            } else {
                alert('Failed to complete inspection');
            }
        } catch (error) {
            console.error('Failed to complete inspection:', error);
        }
    };

    if (!permit) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading permit details...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🔍 Inspection</Text>
                <Text style={styles.permitNumber}>{permit.permitNumber}</Text>
            </View>

            <View style={styles.permitInfo}>
                <Text style={styles.sectionTitle}>Permit Information</Text>
                <Text>Type: {permit.permitType}</Text>
                <Text>Address: {permit.projectAddress}</Text>
                <Text>Applicant: {permit.applicantName}</Text>
            </View>

            <View style={styles.checklistSection}>
                <Text style={styles.sectionTitle}>Inspection Checklist</Text>
                
                <TouchableOpacity 
                    style={styles.checklistItem}
                    onPress={() => addFinding({
                        type: 'SMOKE_DETECTOR',
                        status: 'PASS',
                        description: 'Smoke detectors properly installed'
                    })}
                >
                    <Text>✅ Smoke Detection System</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.checklistItem}
                    onPress={() => addFinding({
                        type: 'FIRE_ALARM',
                        status: 'PASS',
                        description: 'Fire alarm system functional'
                    })}
                >
                    <Text>✅ Fire Alarm Panel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.checklistItem}
                    onPress={() => addFinding({
                        type: 'SPRINKLER',
                        status: 'FAIL',
                        description: 'Sprinkler head clearance violation',
                        violation: 'NFPA 13 8.6.3'
                    })}
                >
                    <Text>❌ Sprinkler System</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.photoSection}>
                <Text style={styles.sectionTitle}>Documentation</Text>
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                    <Text style={styles.photoButtonText}>📷 Take Photo</Text>
                </TouchableOpacity>
                
                <View style={styles.photoGrid}>
                    {inspection.photos.map((photo, index) => (
                        <Image key={index} source={{ uri: photo.uri }} style={styles.photo} />
                    ))}
                </View>
            </View>

            <View style={styles.findingsSection}>
                <Text style={styles.sectionTitle}>Findings ({inspection.findings.length})</Text>
                {inspection.findings.map((finding) => (
                    <View key={finding.id} style={styles.findingItem}>
                        <Text style={finding.status === 'PASS' ? styles.pass : styles.fail}>
                            {finding.status === 'PASS' ? '✅' : '❌'} {finding.type}
                        </Text>
                        <Text>{finding.description}</Text>
                        {finding.violation && (
                            <Text style={styles.violation}>Code: {finding.violation}</Text>
                        )}
                    </View>
                ))}
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity 
                    style={[styles.button, styles.completeButton]} 
                    onPress={completeInspection}
                >
                    <Text style={styles.buttonText}>Complete Inspection</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.button, styles.saveButton]} 
                    onPress={() => alert('Inspection saved as draft')}
                >
                    <Text style={styles.buttonText}>Save Draft</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    permitNumber: {
        fontSize: 18,
        color: '#666',
    },
    permitInfo: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    checklistSection: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    checklistItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    photoSection: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    photoButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginBottom: 12,
    },
    photoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    photo: {
        width: 80,
        height: 80,
        borderRadius: 4,
        margin: 4,
    },
    findingsSection: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    findingItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    pass: {
        color: '#28a745',
        fontWeight: 'bold',
    },
    fail: {
        color: '#dc3545',
        fontWeight: 'bold',
    },
    violation: {
        color: '#dc3545',
        fontSize: 12,
        fontStyle: 'italic',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    completeButton: {
        backgroundColor: '#28a745',
    },
    saveButton: {
        backgroundColor: '#6c757d',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default InspectionScreen;
