// TokenGenerator.h
// Module: Token Generator (Person 1)
// Responsibility: assign a unique, sequential token ID per department.
// e.g. first OPD patient -> "OPD-001", second -> "OPD-002", first emergency -> "EMG-001"

#ifndef TOKEN_GENERATOR_H
#define TOKEN_GENERATOR_H

#include <string>
#include <unordered_map>
#include <iomanip>
#include <sstream>
#include "Token.h"

class TokenGenerator {
private:
    // Keeps a separate counter per department code so each department's
    // numbering starts at 001 independently.
    std::unordered_map<std::string, int> counters;

    std::string padNumber(int number, int width = 3) {
        std::ostringstream oss;
        oss << std::setw(width) << std::setfill('0') << number;
        return oss.str();
    }

public:
    // Generates a new Token for a patient.
    // deptCode: short department code, e.g. "OPD", "CARD"
    // Emergency patients get an "EMG" prefix instead of the department code,
    // per the proposal's token format (Ch. 6.2: e.g. EMG-003).
    Token generateToken(const std::string& patientName,
                         const std::string& deptCode,
                         Urgency urgency) {
        std::string prefix = (urgency == Urgency::EMERGENCY) ? "EMG" : deptCode;

        counters[prefix]++;
        int currentCount = counters[prefix];

        std::string tokenId = prefix + "-" + padNumber(currentCount);

        return Token(tokenId, patientName, deptCode, urgency);
    }

    // Resets the counter for a department (or all departments) for a new session.
    // Matches TC-07 in the proposal: "Token counter reset -> Counter resets to 001"
    void resetCounter(const std::string& deptCode) {
        counters[deptCode] = 0;
    }

    void resetAllCounters() {
        counters.clear();
    }
};

#endif // TOKEN_GENERATOR_H
