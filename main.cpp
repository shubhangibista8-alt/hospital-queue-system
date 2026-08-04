// main.cpp
// Quick manual test of Person 1's core logic: TokenGenerator + PriorityHandler.
// This is NOT the final test suite (that's Person 3's job) -- it's just here
// so you can compile and see your modules actually work, today.

#include <iostream>
#include "Token.h"
#include "TokenGenerator.h"
#include "PriorityHandler.h"

void printToken(const std::string& label, const Token& t) {
    std::cout << label << ": " << t.tokenId
              << " | " << t.patientName
              << " | dept=" << t.department
              << " | urgency=" << (t.urgency == Urgency::EMERGENCY ? "EMERGENCY" : "NORMAL")
              << "\n";
}

int main() {
    TokenGenerator generator;
    PriorityHandler queueSystem;

    // --- TC-01: Normal token generation ---
    Token t1 = generator.generateToken("John", "OPD", Urgency::NORMAL);
    queueSystem.addToken(t1);
    printToken("Generated", t1); // expect OPD-001

    Token t2 = generator.generateToken("Mary", "OPD", Urgency::NORMAL);
    queueSystem.addToken(t2);
    printToken("Generated", t2); // expect OPD-002

    // --- TC-02: Emergency priority ---
    Token t3 = generator.generateToken("Jane", "OPD", Urgency::EMERGENCY);
    queueSystem.addToken(t3);
    printToken("Generated", t3); // expect EMG-001

    std::cout << "\n--- Calling next patients in OPD ---\n";
    Token next;
    // Jane (emergency) should come out BEFORE John, even though John registered first.
    while (queueSystem.callNext("OPD", next)) {
        printToken("Serving", next);
    }

    // --- TC-05: Empty queue call ---
    if (!queueSystem.callNext("OPD", next)) {
        std::cout << "\nDisplay: Queue Empty\n";
    }

    return 0;
}
