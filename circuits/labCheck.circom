pragma circom 2.0.0;
include "circomlib/circuits/comparators.circom";

template LabCheck() {
    signal input labValue;
    signal input labMin;
    signal input labMax;
    signal output ok;

    component lb = LessEqThan(32);
    lb.in[0] <== labMin;
    lb.in[1] <== labValue;

    component ub = LessEqThan(32);
    ub.in[0] <== labValue;
    ub.in[1] <== labMax;

    ok <== lb.out * ub.out;
}