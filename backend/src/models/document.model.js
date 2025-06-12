const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    permitId: {
        type: String,
        required: true,
        index: true
    },
    documentType: {
        type: String,
        required: true,
        enum: ['CUT_SHEET', 'BDA_PHOTO', 'RF_SURVEY', 'REDLINE', 'OTHER']
    },
    originalName: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true,
        unique: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileHash: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'PENDING'
    },
    verificationNotes: {
        type: String
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: {
        type: Date
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    archivedAt: {
        type: Date
    },
    archivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
documentSchema.index({ permitId: 1, documentType: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ uploadedAt: -1 });

// Virtual for document age
documentSchema.virtual('age').get(function() {
    return Date.now() - this.uploadedAt;
});

// Method to verify document
documentSchema.methods.verify = async function(verifiedBy, notes) {
    this.status = 'VERIFIED';
    this.verificationNotes = notes;
    this.verifiedBy = verifiedBy;
    this.verifiedAt = new Date();
    return this.save();
};

// Method to reject document
documentSchema.methods.reject = async function(verifiedBy, notes) {
    this.status = 'REJECTED';
    this.verificationNotes = notes;
    this.verifiedBy = verifiedBy;
    this.verifiedAt = new Date();
    return this.save();
};

// Method to archive document
documentSchema.methods.archive = async function(archivedBy) {
    this.isArchived = true;
    this.archivedBy = archivedBy;
    this.archivedAt = new Date();
    return this.save();
};

// Static method to find documents by permit
documentSchema.statics.findByPermit = function(permitId) {
    return this.find({ permitId, isArchived: false })
        .sort({ uploadedAt: -1 })
        .populate('uploadedBy', 'username firstName lastName')
        .populate('verifiedBy', 'username firstName lastName')
        .populate('archivedBy', 'username firstName lastName');
};

// Static method to find documents by type
documentSchema.statics.findByType = function(documentType) {
    return this.find({ documentType, isArchived: false })
        .sort({ uploadedAt: -1 })
        .populate('uploadedBy', 'username firstName lastName')
        .populate('verifiedBy', 'username firstName lastName')
        .populate('archivedBy', 'username firstName lastName');
};

// Static method to find documents by status
documentSchema.statics.findByStatus = function(status) {
    return this.find({ status, isArchived: false })
        .sort({ uploadedAt: -1 })
        .populate('uploadedBy', 'username firstName lastName')
        .populate('verifiedBy', 'username firstName lastName')
        .populate('archivedBy', 'username firstName lastName');
};

// Static method to find documents by uploader
documentSchema.statics.findByUploader = function(uploadedBy) {
    return this.find({ uploadedBy, isArchived: false })
        .sort({ uploadedAt: -1 })
        .populate('uploadedBy', 'username firstName lastName')
        .populate('verifiedBy', 'username firstName lastName')
        .populate('archivedBy', 'username firstName lastName');
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document; 