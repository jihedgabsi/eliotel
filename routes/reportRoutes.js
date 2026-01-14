const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { auth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

// @desc    Signaler un contenu ou un utilisateur
// @route   POST /api/reports
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { reportedUser, reportedListing, reason, details } = req.body;

        const report = new Report({
            reporter: req.user.userId, // req.user d'auth.js contient souvent userId ou id
            reportedUser,
            reportedListing,
            reason,
            details
        });

        await report.save();

        // Notifier les modérateurs
        notificationService.notifyModeratorsReport(report).catch(err => {
            console.error('Erreur lors de la notification des modérateurs:', err);
        });

        res.status(201).json({
            success: true,
            data: report,
            message: 'Signalement envoyé avec succès. Nous allons l\'examiner dans les 24 heures.'
        });
    } catch (error) {
        console.error('Erreur lors du signalement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi du signalement'
        });
    }
});

// @desc    Obtenir tous les signalements (pour l'admin)
// @route   GET /api/reports
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
    try {
        // Vérifier si l'utilisateur est admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Non autorisé' });
        }

        const reports = await Report.find()
            .populate('reporter', 'firstName lastName email')
            .populate('reportedUser', 'firstName lastName email')
            .populate('reportedListing', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: reports
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des signalements'
        });
    }
});

module.exports = router;
