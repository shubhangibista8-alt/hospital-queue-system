// PriorityHandler.h
// Module: Priority Handler (Person 1)
// Responsibility: ensure Emergency (Level 0) tokens are always served before
// Normal (Level 1) tokens, and that two emergencies are served in timestamp order.
// (Proposal Ch. 6.3: "two-level system... earlier timestamp takes precedence")
//
// Design: inherits QueueManager and overrides addToken() so emergency patients
// are inserted in the correct priority position instead of just appended.

#ifndef PRIORITY_HANDLER_H
#define PRIORITY_HANDLER_H

#include "QueueManager.h"
#include <algorithm>

class PriorityHandler : public QueueManager {
public:
    // Adds a token to the correct position based on urgency:
    // - NORMAL tokens go to the back, same as plain FIFO.
    // - EMERGENCY tokens are inserted after any existing emergencies with an
    //   earlier timestamp, but before all NORMAL tokens — preserving fairness
    //   among emergencies while still jumping the normal queue.
    void addToken(const Token& token) override {
        if (token.urgency == Urgency::NORMAL) {
            departmentQueues[token.department].push_back(token);
            return;
        }

        auto& dq = departmentQueues[token.department];

        // Find the first NORMAL token, or the first EMERGENCY token with a
        // later timestamp -- the new token gets inserted right before it.
        auto insertPos = dq.begin();
        while (insertPos != dq.end()
               && insertPos->urgency == Urgency::EMERGENCY
               && insertPos->timestamp <= token.timestamp) {
            ++insertPos;
        }

        dq.insert(insertPos, token);
    }
};

#endif // PRIORITY_HANDLER_H
