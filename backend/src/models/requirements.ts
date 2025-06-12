import mongoose, { Schema, Document } from 'mongoose';

export interface IRequirement extends Document {
    code: string;
    section: string;
    description: string;
    category: 'BDA' | 'DAS' | 'General';
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    validationRules: {
        type: string;
        parameters: any;
    }[];
    references: string[];
}

const RequirementSchema = new Schema({
    code: { type: String, required: true, index: true },
    section: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        required: true,
        enum: ['BDA', 'DAS', 'General']
    },
    priority: {
        type: String,
        required: true,
        enum: ['Critical', 'High', 'Medium', 'Low']
    },
    validationRules: [{
        type: { type: String, required: true },
        parameters: { type: Schema.Types.Mixed }
    }],
    references: [{ type: String }]
});

// Add some initial requirements
const initialRequirements = [
    {
        code: 'NFPA72-24.3.1',
        section: '24.3.1',
        description: 'BDA System Components',
        category: 'BDA',
        priority: 'Critical',
        validationRules: [
            {
                type: 'componentCheck',
                parameters: {
                    required: ['Donor Antenna', 'BDA', 'Battery Backup', 'Surge Protection']
                }
            }
        ],
        references: ['NFPA 72 2019 Edition']
    },
    {
        code: 'NFPA72-24.3.2',
        section: '24.3.2',
        description: 'BDA Power Requirements',
        category: 'BDA',
        priority: 'Critical',
        validationRules: [
            {
                type: 'powerCheck',
                parameters: {
                    minBatteryBackup: 24, // hours
                    requiredVoltage: 120
                }
            }
        ],
        references: ['NFPA 72 2019 Edition']
    },
    {
        code: 'NFPA72-24.3.3',
        section: '24.3.3',
        description: 'Signal Strength Requirements',
        category: 'DAS',
        priority: 'High',
        validationRules: [
            {
                type: 'signalStrength',
                parameters: {
                    minGain: 13, // dBd
                    coverageThreshold: -95 // dBm
                }
            }
        ],
        references: ['NFPA 72 2019 Edition']
    }
];

// Create the model
const Requirement = mongoose.model<IRequirement>('Requirement', RequirementSchema);

// Initialize requirements if they don't exist
const initializeRequirements = async () => {
    try {
        const count = await Requirement.countDocuments();
        if (count === 0) {
            await Requirement.insertMany(initialRequirements);
            console.log('Initial requirements loaded');
        }
    } catch (error) {
        console.error('Error initializing requirements:', error);
    }
};

export { Requirement, initializeRequirements }; 