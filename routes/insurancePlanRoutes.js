const express = require('express');
const router = express.Router();
const InsurancePlan = require('../models/InsurancePlan');


// Define a Helper Function for Error Responses
function sendErrorResponses(res, statusCode, message) {
    res.status(statusCode).json({error: message});
}

// Get all insurance plans with optional filtering
router.get('/', async(req, res) => {
    let query = {};

    // Independent filter: Inpatient limit can be filtered without other criteria
    if (req.query.inpatientLimit) {
        query.inpatientLimit = req.query.inpatientLimit;
    }

    // Dependent filters: Apply only if their respective dependencies are met
    // Apply the companyName filter only if the inpatientLimit is also provided
    if (req.query.companyName && !req.query.inpatientLimit) {
        return sendErrorResponses(res, 400, "Filtering by company name requires specifying an inpatient limit");
    }

    if (req.query.companyName && req.query.inpatientLimit) {
        query.companyName = req.query.companyName;
    }
    
    // Apply the outpatientLimit filter only if the inpatientLimit is also provided
    if (req.query.outpatientLimit && !req.query.inpatientLimit) {
        return sendErrorResponses(res, 400, "Filtering by outpatient limit requires specifying an inpatient limit.");
    }


    if (req.query.outpatientLimit && req.query.inpatientLimit) {
        query.outpatientLimit = req.query.outpatientLimit;
    }

    // Filtering by principal age requires specifying an inpatient limit
    if (req.query.principalAge && !req.query.inpatientLimit) {
        return sendErrorResponses(res, 400, "Filtering by principal age requires specifying an inpatient limit.");
    }

    // Filtering by spouse age requires specifying both an inpatient limit and principal age
    if (req.query.spouseAge && (!req.query.inpatientLimit || !req.query.principalAge)) {
        return sendErrorResponses(res, 400, "Filtering by spouse age requires specifying both an inpatient limit and principal age.");
    }

    // Filtering by number of kids requires specifying both an inpatient limit and principal age
    if (req.query.numberOfKids && (!req.query.inpatientLimit || !req.query.principalAge)) {
        return sendErrorResponses(res, 400, "Filtering by number of kids requires specifying both an inpatient limit and principal age.");
    }
    // Additional validation to ensure the number of kids is within the allowed range
    const numberOfKids = parseInt(req.query.numberOfKids, 10);
    if (isNaN(numberOfKids) || numberOfKids < 1 || numberOfKids > 5) {
        return sendErrorResponses(res, 400, "The number of kids must be between 1 and 5.");
    }


    if (req.query.principalAge && req.query.inpatientLimit) {
        query.ageMinimum = {$lte: req.query.principalAge};
        query.ageMaximum = {$gte: req.query.principalAge};
    }

    // Example of handling additional covers with dependencies
    // Filtering by maternity requires specifying both an inpatient limit and principal age
    if (req.query.maternity && (!req.query.inpatientLimit || !req.query.principalAge)) {
        return sendErrorResponses(res, 400, "Filtering by maternity requires specifying both an inpatient limit and principal age.");
    }

    if (req.query.maternity && req.query.inpatientLimit && req.query.principalAge) {
        query['additionalCovers.maternity'] = req.query.maternity === 'true';
    }

    // Filtering by dental requires specifying inpatient limit, principal age, and outpatient limit
    if (req.query.dental && (!req.query.inpatientLimit || !req.query.principalAge || !req.query.outpatientLimit)) {
        return sendErrorResponses(res, 400, "Filtering by dental requires specifying inpatient limit, principal age, and outpatient limit.");
    }

    if (req.query.dental && req.query.inpatientLimit && req.query.principalAge && req.query.outpatientLimit) {
        query['additionalCovers.dental'] = req.query.dental === 'true';
        // Automatically include optical if dental is selected
        query['additionalCovers.optical'] = req.query.dental === 'true';
    }

    try {
        const plans = await InsurancePlan.find(query);
        if(plans.length === 0) {
            return sendErrorResponses(res, 404, "No plans found matching the specified criteria.");
        }
        res.json(plans);
    } catch (err) {
        return sendErrorResponse(res, 500, "An error occurred while fetching plans.");
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
            maternity: {
                included: req.body.additionalCovers.maternity.included,
                limit: req.body.additionalCovers.maternity.limit
            },
            dental: {
                included: req.body.additionalCovers.dental.included,
                limit: req.body.additionalCovers.dental.limit
            },
            optical: {
                included: req.body.additionalCovers.optical.included,
                limit: req.body.additionalCovers.optical.limit
            }      
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
            if (req.body.additionalCovers[cover] != null && res.plan.additionalCovers[cover] != undefined) {
                res.plan.additionalCovers[cover].included = req.body.additionalCovers[cover].included;
                // Only update the limit if it's provided
                if (req.body.additionalCovers[cover].limit != null) {
                    res.plan.additionalCovers[cover].limit = req.body.additionalCovers[cover].limit;
                }
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