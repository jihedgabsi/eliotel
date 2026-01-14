const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Rapporteur est requis']
    },
    reportedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reportedListing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing'
    },
    reason: {
        type: String,
        required: [true, 'Raison du signalement est requise'],
        trim: true
    },
    details: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// S'assurer qu'au moins un élément est signalé
reportSchema.pre('validate', function (next) {
    if (!this.reportedUser && !this.reportedListing) {
        next(new Error('Vous devez signaler un utilisateur ou une annonce'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Report', reportSchema);
