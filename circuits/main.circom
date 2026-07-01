pragma circom 2.0.0;

include "ageCheck.circom";
include "diagnosisCheck.circom";
include "labCheck.circom";

template MultiConditionQuery() {
    // Private inputs (patient data)
    signal input patientAge;
    signal input patientDiagnosis;
    signal input patientLab;

    // Query parameters – now also inputs, but we'll output them to make them public
    signal input minAge;
    signal input maxAge;
    signal input allowedDiagnoses[10];
    signal input labMin;
    signal input labMax;

    // Outputs: the result AND the query parameters (to make them public)
    signal output out;
    signal output minAgePub;
    signal output maxAgePub;
    signal output allowedDiagnosesPub[10];
    signal output labMinPub;
    signal output labMaxPub;

    // Copy query parameters to outputs (they become public signals)
    minAgePub <== minAge;
    maxAgePub <== maxAge;
    for (var i = 0; i < 10; i++) {
        allowedDiagnosesPub[i] <== allowedDiagnoses[i];
    }
    labMinPub <== labMin;
    labMaxPub <== labMax;

    // Age check
    component age = AgeCheck();
    age.age <== patientAge;
    age.minAge <== minAge;
    age.maxAge <== maxAge;

    // Diagnosis check
    component diag = DiagnosisCheck(10);
    diag.diagnosis <== patientDiagnosis;
    for (var i = 0; i < 10; i++) {
        diag.allowedDiagnoses[i] <== allowedDiagnoses[i];
    }

    // Lab check
    component lab = LabCheck();
    lab.labValue <== patientLab;
    lab.labMin <== labMin;
    lab.labMax <== labMax;

    // Combine conditions
    signal inter1 <== age.ok * diag.ok;
    signal final <== inter1 * lab.ok;
    out <== final;
}

component main = MultiConditionQuery();