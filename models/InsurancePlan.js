const mongoose = require('mongoose');

const InsurancePlanSchema = new mongoose.Schema({
    companyName: {type: String, required: true, index: true},
    planName: {type: String, required: true},
    inpatientLimit: {type: Number, required: true, index: true},
    outpatientLimit: Number, // Optional
    ageMinimum: {type: Number, required: true, index: true},
    ageMaximum: {type: Number, required: true, index: true},
    allowsKids: {type: Boolean, default: true},
    additionalCovers: {
        maternity: {included: Boolean, limit: Number}, // Optional
        dental: {included: Boolean, limit: Number}, // Optional
        optical: {included: Boolean, limit: Number}, // Optional
    },
    hospitalBedPerNight: {type: Number, required: true},
    preExistingConditionsInpatientLimit: {type: Number, required: true},
    personalAccidentCoverLimit: Number, // Optional
    criticalIllnessCoverLimit: Number, // Optional,
    lastExpenseFuneralCostsLimit: Number, // Optional
    coPayment: String, // Optional
    preExistingConditionsWaitingPeriodYears: {type: Number, required: true},
    maternityWaitingPeriodMonths: Number, // Optional, dependent on maternity cover selection
    illnessClaimsWaitingPeriodMonths: {type: Number, default: 1, required: true},
    surgicalClaimsWaitingPeriodMonths: {type: Number, default: 2, required: true},
    organTransplantWaitingPeriodYears: {type: Number, required: true},
    cancerWaitingPeriodYears: {type: Number, required: true},
    accidentsWaitingPeriod: {type: String, default: "No Waiting!", required: true},
    panelOfHospitalsLink: {type: String, required: true},
    insurancePlanBrochureLink: {type: String, required: true},
    applicationFormLink: {type: String, required: true},
    // Add other fields as necessary
});

const InsurancePlan = mongoose.model('InsurancePlan', InsurancePlanSchema);

module.exports = InsurancePlan;