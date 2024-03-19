const express = require('express');
const router = express.Router();
const InsurancePlan = require('../models/InsurancePlan');

// Get all insurance plans
router.get('/', async(req, res) => {
    try {
        const plans = await InsurancePlan.find();
        res.json(plans);
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

// Create a new insurance plan
router.post('/', async(req, res) => {
    const plan = new InsurancePlan({
        // Map request body to schema fields
        companyName: req.body.companyName,
        planName: req.body.planName,
        inpatientLimit: req.body.inpatientLimit,
        outpatientLimit: req.body.outpatientLimit,
        ageMinimum: req.body.ageMinimum,
        ageMaximum: req.body.ageMaximum,

        additionalCovers: {
            maternity: req.body.maternity,
            dental: req.body.dental,
            optical: req.body.optical
        },
        hospitalBedPerNight: req.body.hospitalBedPerNight,
        preExistingConditionsInpatientLimit: req.body.preExistingConditionsInpatientLimit,
        personalAccidentCoverLimit: req.body.personalAccidentCoverLimit,
        criticalIllnessCoverLimit: req.body.criticalIllnessCoverLimit,
        lastExpenseFuneralCostsLimit: req.body.lastExpenseFuneralCostsLimit,
        coPayment: req.body.coPayment,
        preExistingConditionsWaitingPeriodYears: req.body.preExistingConditionsWaitingPeriodYears,
        maternityWaitingPeriodMonths: req.body.maternityWaitingPeriodMonths,
        illnessClaimsWaitingPeriodMonths: req.body.illnessClaimsWaitingPeriodMonths,
        surgicalClaimsWaitingPeriodMonths: req.body.surgicalClaimsWaitingPeriodMonths,
        organTransplantWaitingPeriodYears: req.body.organTransplantWaitingPeriodYears,
        cancerWaitingPeriodYears: req.body.cancerWaitingPeriodYears,
        accidentsWaitingPeriod: req.body.accidentsWaitingPeriod,
        panelOfHospitalsLink: req.body.panelOfHospitalsLink,
        insurancePlanBrochureLink: req.body.insurancePlanBrochureLink,
    });
    
    // Attempt to save the new plan
    try {
        const newPlan = await plan.save();
        res.status(201).json(newPlan);
    } catch (err) {
        res.status(400).json({message: err.message});
    }
});

// Get a single insurance plan by ID
router.get('/:id', getPlan, (req, res) => {
    res.json(res.plan);
});

// Update an insurance plan
router.patch('/:id', getPlan, async (req, res) => {
    // 1st, Dynamically update top-level fields, ensuring they're not nested objects
    Object.keys(req.body).forEach(prop => {
        if (req.body[prop] != null && typeof res.plan[prop] !== 'object' && res.plan[prop] !== undefined) {
            res.plan[prop] = req.body[prop];
        }
    });

    // 2nd, special handling for the 'additionalCovers' nested object
    if (req.body.additionalCovers) {
        Object.keys(req.body.additionalCovers).forEach(cover => {
            if (req.body.additionalCovers[cover] != null && res.plan.additionalCovers[cover] !== undefined) {
                res.plan.additionalCovers[cover] = req.body.additionalCovers[cover];
            }
        });
    }

    try {
        const updatedPlan = await res.plan.save();
        res.json(updatedPlan);
    } catch (err) {
        res.status(400).json({message: err.message});
    }
});

// Delete an insurance plan
router.delete('/:id', getPlan, async (req, res) => {
    try {
        await res.plan.remove();
        res.json({message: 'Deleted Insurance Plan'});
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

// Middleware to get a plan by ID
async function getPlan(req, res, next) {
    let plan;
    try {
        plan = await InsurancePlan.findById(req.params.id);
        if (plan === null) {
            return res.status(404).json({message: 'Cannot find plan'});
        }
    } catch (err) {
        return res.status(500).json({message: err.message});
    }

    res.plan = plan;
    next();
}

module.exports = router;