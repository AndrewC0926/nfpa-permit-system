const mongoose = require('mongoose');

const checklistSchema = new mongoose.Schema({
    cutSheetsSubmitted: {
        type: Boolean,
        default: false
    },
    bdaPhotosSubmitted: {
        type: Boolean,
        default: false
    },
    rfSurveySubmitted: {
        type: Boolean,
        default: false
    },
    redlinesSubmitted: {
        type: Boolean,
        default: false
    },
    allRequirementsMet: {
        type: Boolean,
        default: false
    }
});

const permitSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    applicantName: {
        type: String,
        required: true
    },
    projectAddress: {
        type: String,
        required: true
    },
    permitType: {
        type: String,
        required: true,
        enum: ['ERRCS', 'FIRE_ALARM', 'SPRINKLER', 'OTHER']
    },
    status: {
        type: String,
        required: true,
        enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
        default: 'SUBMITTED'
    },
    submissionDate: {
        type: Date,
        default: Date.now
    },
    approvalDate: {
        type: Date
    },
    documents: [{
        type: String
    }],
    checklist: {
        type: checklistSchema,
        default: () => ({})
    },
    transactionHash: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
permitSchema.index({ id: 1 });
permitSchema.index({ applicantName: 1 });
permitSchema.index({ status: 1 });
permitSchema.index({ submissionDate: 1 });

// Virtual for checking if all requirements are met
permitSchema.virtual('isComplete').get(function() {
    return this.checklist.cutSheetsSubmitted &&
           this.checklist.bdaPhotosSubmitted &&
           this.checklist.rfSurveySubmitted &&
           this.checklist.redlinesSubmitted;
});

// Pre-save middleware to update allRequirementsMet
permitSchema.pre('save', function(next) {
    this.checklist.allRequirementsMet = this.isComplete;
    next();
});

const Permit = mongoose.model('Permit', permitSchema);

module.exports = Permit; 