// Token.h
// Shared data structure for the To Care system.
// Person 2 (interface) and Person 3 (testing/storage) will both include this file,
// so keep changes here communicated to the whole team.

#ifndef TOKEN_H
#define TOKEN_H

#include <string>
#include <ctime>

// Urgency level: lower number = higher priority.
// LEVEL_0 (Emergency) is always served before LEVEL_1 (Normal).
enum class Urgency {
    EMERGENCY = 0,
    NORMAL = 1
};

struct Token {
    std::string tokenId;       // e.g. "OPD-001", "EMG-003"
    std::string patientName;
    std::string department;    // e.g. "OPD", "Cardiology"
    Urgency urgency;
    time_t timestamp;          // used to break ties between same-priority tokens

    Token() : urgency(Urgency::NORMAL), timestamp(0) {}

    Token(std::string id, std::string name, std::string dept, Urgency u)
        : tokenId(std::move(id)), patientName(std::move(name)),
          department(std::move(dept)), urgency(u), timestamp(std::time(nullptr)) {}
};

#endif // TOKEN_H
