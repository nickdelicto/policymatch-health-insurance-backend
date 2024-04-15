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
    let errors = [];

    // Independent filter: Inpatient limit can be filtered without other criteria
    if (req.query.inpatientLimit) {
        query.inpatientLimit = parseInt(req.query.inpatientLimit);
    } else {
        errors.push("Inpatient limit is required for filtering.");
    }

    // Dependent filters: Apply only if their respective dependencies are met
    // Company Name filter depends on Inpatient Limit
    if (req.query.companyName) {
        if (!req.query.inpatientLimit) {
            errors.push("Filtering by company name requires specifying an inpatient limit.");
        } else {
            query.companyName = req.query.companyName;
        }
    }

    
    // Outpatient Limit filter also depends on Inpatient Limit
    if (req.query.outpatientLimit && req.query.outpatientLimit !== 'none') {
        if (!req.query.inpatientLimit) {
            errors.push("Filtering by outpatient limit requires specifying an inpatient limit.");
        } else {
            query.outpatientLimit = parseInt(req.query.outpatientLimit);
        }
    }
    

    // Principal Age filter consolidation with Inpatient Limit dependency
    if (req.query.principalAge) {
        if (!req.query.inpatientLimit) {
            errors.push("Filtering by principal age requires specifying an inpatient limit.")
        } else {
            let age = parseInt(req.query.principalAge);
            query.ageMinimum = {$lte: age};
            query.ageMaximum = {$gte: age};
        }
    }


    // Spouse Age filter with Inpatient Limit and Principal Age dependency
    if (req.query.spouseAge) {
        if (!req.query.inpatientLimit || !req.query.principalAge) {
            errors.push("Filtering by spouse age requires specifying both an inpatient limit and principal age.")
        } else {
            let age = parseInt(req.query.spouseAge);
            query.$and = query.$and ? [...query.$and, {ageMinimum: {$lte: age}, ageMaximum: {$gte: age}}]
                                        : [{ageMinimum: {$lte: age}, ageMaximum: {$gte: age}}];
        }
    }


    // Filtering by Number of Kids
    if (req.query.numberOfKids) {
        const numberOfKids = parseInt(req.query.numberOfKids, 10);
        if(!req.query.inpatientLimit || !req.query.principalAge || isNaN(numberOfKids) || numberOfKids < 1 || numberOfKids > 5) {
            return sendErrorResponses(res, 400, "Filtering by number of kids requires specifying both an inpatient limit and principal age. Number of kids must be between 1 and 5.");
        } else {
            // Ensuring the query only targets plans that allow kids
            query.allowsKids = true;
        }
    }




    // Additional cover filters with dependencies
    // 1. Maternity
    if (req.query.maternity) {
        if (!req.query.inpatientLimit || !req.query.principalAge) {
            errors.push("Filtering by maternity cover requires specifying both an inpatient limit and principal age.")
        } else {
            query["additionalCovers.maternity.included"] = req.query.maternity === 'true';
        }
    }

    // 2. Dental & Optical Filters
    if (req.query.dental === 'yes' || req.query.optical === 'yes') {
        if (req.query.outpatientLimit === 'none' || !req.query.outpatientLimit) {
            errors.push("Filtering by dental/optical requires specifying a valid outpatient limit.");
        } else if (req.query.inpatientLimit && req.query.principalAge && req.query.outpatientLimit && req.query.outpatientLimit !== 'none') {
            query["additionalCovers.dental.included"] = req.query.dental === 'yes';
            query["additionalCovers.optical.included"] = req.query.optical === 'yes' || req.query.dental === 'yes'; // Ensure optical is included if either is true
        }
    }

    // Handling errors
    if (errors.length > 0) {
        return sendErrorResponses(res, 400, errors.join(" "));
    }



    // Executing query with built filters
    try {
        const plans = await InsurancePlan.find(query);
        if (plans.length === 0) {
            return res.status(404).send("No plans found matching the specified criteria.")
        }
        res.json(plans);
    } catch (err) {
        res.status(500).send("An error occurred while fetching plans: " + err.message);
    };
});


// Endpoint to Get unique Outpatient limits based on Inpatient limit
router.get('/outpatient-limits/:inpatientLimit', async (req, res) => {
    const inpatientLimit = parseInt(req.params.inpatientLimit);
    if (isNaN(inpatientLimit)) {
        return res.status(400).json({error: 'Invalid inpatient limit'});
    }

    try {
        const limits = await InsurancePlan.distinct('outpatientLimit', {
            inpatientLimit: inpatientLimit,
            outpatientLimit: {$ne: null} // Ensure no null values are considered
        });
        // Return sorted limits without including 'No Outpatient' automatically
        const formattedLimits = limits.sort((a, b) => a - b).map(limit => `Kshs ${limit}`);
        res.json(formattedLimits);
    } catch (error) {
        res.status(500).json({error: error.message});
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
        allowsKids: req.body.allowsKids,

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