pragma circom 2.0.0;
include "circomlib/circuits/comparators.circom";

template AgeCheck() {
    signal input age;
    signal input minAge;
    signal input maxAge;
    signal output ok;

    component lb = LessEqThan(32);
    lb.in[0] <== minAge;
    lb.in[1] <== age;

    component ub = LessEqThan(32);
    ub.in[0] <== age;
    ub.in[1] <== maxAge;

    ok <== lb.out * ub.out;
}