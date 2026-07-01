pragma circom 2.0.0;
include "circomlib/circuits/comparators.circom";

template DiagnosisCheck(maxDiagnoses) {
    signal input diagnosis;
    signal input allowedDiagnoses[maxDiagnoses];
    signal output ok;

    signal sums[maxDiagnoses+1];
    sums[0] <== 0;

    // Declare component array outside loop
    component eq[maxDiagnoses];

    for (var i = 0; i < maxDiagnoses; i++) {
        eq[i] = IsEqual();
        eq[i].in[0] <== diagnosis;
        eq[i].in[1] <== allowedDiagnoses[i];
        sums[i+1] <== sums[i] + eq[i].out;
    }

    component isZero = IsZero();
    isZero.in <== sums[maxDiagnoses];
    ok <== 1 - isZero.out;   // 1 if at least one match
}