// QueueManager.h
// Module: Queue Manager (Person 1)
// Responsibility: maintain a separate FIFO queue per department.
// Normal patients are served in the order they registered.

#ifndef QUEUE_MANAGER_H
#define QUEUE_MANAGER_H

#include <deque>
#include <unordered_map>
#include <string>
#include <vector>
#include "Token.h"

class QueueManager {
protected:
    // One queue per department. Using deque so we can pop from the front
    // (next patient) and, for the Priority Handler, push to the front too.
    std::unordered_map<std::string, std::deque<Token>> departmentQueues;

    // Skipped tokens go here so the admin can re-insert them later (proposal Ch. 6.3).
    std::vector<Token> pendingList;

public:
    // Adds a token to the back of its department's queue (plain FIFO).
    virtual void addToken(const Token& token) {
        departmentQueues[token.department].push_back(token);
    }

    // Returns and removes the next token to be served in a department.
    // Returns false if the queue is empty (matches TC-05: "Display: Queue Empty").
    bool callNext(const std::string& department, Token& outToken) {
        auto it = departmentQueues.find(department);
        if (it == departmentQueues.end() || it->second.empty()) {
            return false;
        }
        outToken = it->second.front();
        it->second.pop_front();
        return true;
    }

    // Skips the token currently at the front without serving it,
    // moving it to the pending list (TC-04: "Skip token -> next token served").
    bool skipToken(const std::string& department) {
        auto it = departmentQueues.find(department);
        if (it == departmentQueues.end() || it->second.empty()) {
            return false;
        }
        pendingList.push_back(it->second.front());
        it->second.pop_front();
        return true;
    }

    // Re-inserts a previously skipped token at the front of its department queue.
    bool reinsertPending(const std::string& tokenId) {
        for (auto i = pendingList.begin(); i != pendingList.end(); ++i) {
            if (i->tokenId == tokenId) {
                departmentQueues[i->department].push_front(*i);
                pendingList.erase(i);
                return true;
            }
        }
        return false;
    }

    int queueLength(const std::string& department) {
        auto it = departmentQueues.find(department);
        return (it == departmentQueues.end()) ? 0 : static_cast<int>(it->second.size());
    }

    bool isEmpty(const std::string& department) {
        return queueLength(department) == 0;
    }
};

#endif // QUEUE_MANAGER_H
