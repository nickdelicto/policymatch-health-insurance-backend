const mongoose = require('mongoose');

const InsurancePlanSchema = new mongoose.Schema({
    companyName: String,
    planName: String,
    inpatientLimit: Number,
    outpatientLimit: Number,
    ageMinimum: Number,
    ageMaximum: Number,
    additionalCovers: {
        maternity: Boolean,
        dental: Boolean,
        optical: Boolean,
    },
    hospitalBedPerNight: Number,
    preExistingConditionsInpatientLimit: Number,
    personalAccidentCoverLimit: Number,
    criticalIllnessCoverLimit: Number,
    lastExpenseFuneralCostsLimit: Number,
    coPayment: String,
    panelOfHospitalsLink: String,
    preExistingConditionsWaitingPeriodYears: Number,
    maternityWaitingPeriodMonths: Number,
    illnessClaimsWaitingPeriodMonths: {type: Number, default: 1},
    surgicalClaimsWaitingPeriodMonths: {type: Number, default: 2},
    organTransplantWaitingPeriodYears: Number,
    cancerWaitingPeriodYears: Number,
    accidentsWaitingPeriod: {type: String, default: "No Waiting!"},
    // Add other fields as necessary
});

const InsurancePlan = mongoose.model('InsurancePlan', InsurancePlanSchema);

module.exports = InsurancePlan;