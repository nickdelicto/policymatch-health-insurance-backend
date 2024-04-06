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
    if(req.query.principalAge && req.query.inpatientLimit) {
        const principalAge = parseInt(req.query.principalAge, 10);
        // Ensure principal age is within the plan's age range
        query.ageMinimum = {$lte: principalAge};
        query.ageMaximum = {$gte: principalAge};
    } else if (req.query.principalAge && !req.query.inpatientLimit) {
        return sendErrorResponses(res, 400, "Filtering by principal age requires specifying an inpatient limit.");
    }

    // Filtering by spouse age requires specifying both an inpatient limit and principal age
    if (req.query.spouseAge && req.query.inpatientLimit && req.query.principalAge) {
        const spouseAge = parseInt(req.query.spouseAge, 10);
        // If our data model required additional logic for spouse, we could implement it here
        // Ensure spouse age is within the plan's age range
        if (!isNaN(spouseAge)) {
            /*Since MongoDB doesn't directly support multiple conditions for the same field in one query object,
            we need to ensure the logic here properly insersects with principalAge logic or
            consider a different approach to validate both ages are within the band if this doesn't work as expected.*/ 
            query.$and = [
                {ageMinimum: {$lte: spouseAge}},
                {ageMaximum: {$gte: spouseAge}}
            ];
        }
    } else if (req.query.spouseAge && (!req.query.inpatientLimit || !req.query.principalAge)) {
        return sendErrorResponses(res, 400, "Filtering by spouse age requires specifying both an inpatient limit and principal age.");
    }

    // Filtering by number of kids requires specifying both an inpatient limit and principal age
    // Check if the numberOfKids query parameter is provided before validating it
    if (req.query.numberOfKids) {
        if (!req.query.inpatientLimit || !req.query.principalAge) {
            return sendErrorResponses(res, 400, "Filtering by number of kids requires specifying both an inpatient limit and principal age.");
        }
        // Additional validation to ensure the number of kids is within the allowed range
        const numberOfKids = parseInt(req.query.numberOfKids, 10);
        if (isNaN(numberOfKids) || numberOfKids < 1 || numberOfKids > 5) {
            return sendErrorResponses(res, 400, "The number of kids must be between 1 and 5.");
        }
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

    console.log('Final query object:', query);

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
        applicationFormLink: req.body.applicationFormLink,
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

// Bulk update multiple insurance plans based on a specific criterion
// Reminder: Implement authentication and authorization checks here
router.patch('/bulk-update', async (req, res) => {
    const {matchCondition, updates} = req.body; // Example: matchCondition: {companyName: "Jubilee Health Insurance"}, updates: {companyName: "Jubilee Allianz Health Insurance", inpatientLimitName: "Hospitalization Limit"}
    
    try{
        // TODO: Ensure to check user permissions before proceeding with the bulk update
        const updatedPlans = await InsurancePlan.updateMany(matchCondition, {$set: updates});
        if (updatedPlans.modifiedCount === 0) {
            return res.status(404).json({message: 'No plans found or no update required for the provided condition.'});
        }
        res.json({message: `${updatedPlans.modifiedCount} plans updated.`});
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

// Bulk remove  a specific property from plans based on criteria
router.patch('/bulk-remove-property', async (req, res) => {
    const {criteria, propertyToRemove} = req.body;

        // TODO: Add authentication check here before proceeding with the removal

    try {
        // Set the property to undefined for all matching documents
        const update = {$unset: {[propertyToRemove]: ""}};
        console.log(await InsurancePlan.find(criteria));
        const result = await InsurancePlan.updateMany(criteria, update);

        // Respond with the number of documents updated
        res.json({message: `${result.modifiedCount} plans updated to remove ${propertyToRemove}.`});
    } catch (err) {
        // Handle potential errors
        res.status(500).json({message: err.message});
    }
});


// Update an insurance plan
router.patch('/:id', getPlan, async (req, res) => {
    // 1st, Dynamically update top-level fields, ensuring they're not nested objects
    Object.keys(req.body).forEach(prop => {
        if (req.body[prop] != null && prop !== 'additionalCovers' && res.plan[prop] !== undefined) {
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

// First, define the batch delete route- Delete multiple insurance plans based on several plan IDs
router.delete('/batch', async (req, res) => {
    console.log(req.body.ids); // Logging to debug
    const IdsToDelete = req.body.ids; // Expect an array of IDs in the request body
    try {
        const result = await InsurancePlan.deleteMany({_id: {$in: IdsToDelete}});
        res.json({message: `${result.deletedCount} plans deleted.`});
    } catch (err) {
        res.status(500).json({message: err.message});
    }
});

// Bulk delete plans based on specific criteria
router.delete('/bulk-delete', async (req, res) => {
    const criteria = req.body; // Example criteria could include companyName, planName, etc.

    // TODO: Add authentication check here before proceeding with the deletion

    try {
        // Perform the deletion based on matching criteria
        const result = await InsurancePlan.deleteMany(criteria);

        // Respond with the number of documents deleted
        res.json({message: `${result.deletedCount} plans deleted.`});
    } catch (err) {
        // Handle potential errors
        res.status(500).json({message: err.message});
    }
});


// Then, define the delete route by ID- Delete an insurance plan
router.delete('/:id', async (req, res) => {
    try {
        const deletedPlan = await InsurancePlan.findByIdAndDelete(req.params.id);
        if (!deletedPlan) {
            return res.status(404).json({message: 'Cannot find plan'});
        }
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