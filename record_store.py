from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime

app = FastAPI(title='Hospital Queue Backend')

@app.get('/')
def root() -> dict:
    return {
        'message': 'Hospital Queue Backend is running. Use /api/state, /api/token, /api/call, /api/skip, /api/reinsert, /api/reset-counters.',
    }

@app.get('/api')
def api_root() -> dict:
    return {
        'message': 'Hospital Queue API root. Available endpoints: /api/state, /api/token, /api/call, /api/skip, /api/reinsert, /api/reset-counters.',
    }

class Urgency(str, Enum):
    EMERGENCY = 'EMERGENCY'
    NORMAL = 'NORMAL'

class Token(BaseModel):
    tokenId: str
    patientName: str
    department: str
    urgency: Urgency
    timestamp: int

class TokenCreate(BaseModel):
    patientName: str
    department: str
    urgency: Urgency

class TokenResponse(BaseModel):
    token: Optional[Token] = None

class ReinsertResponse(BaseModel):
    success: bool

class QueueState(BaseModel):
    queues: Dict[str, List[Token]]
    pending: List[Token]
    departments: List[str]

counters: Dict[str, int] = {}
queues: Dict[str, List[Token]] = {}
pending_list: List[Token] = []

@app.get('/api/state', response_model=QueueState)
def get_state() -> QueueState:
    return QueueState(
        queues={department: list(tokens) for department, tokens in queues.items()},
        pending=list(pending_list),
        departments=sorted(set(list(queues.keys()) + [token.department for token in pending_list])),
    )

@app.post('/api/token', response_model=TokenResponse)
def create_token(payload: TokenCreate) -> TokenResponse:
    prefix = 'EMG' if payload.urgency == Urgency.EMERGENCY else payload.department
    next_count = counters.get(prefix, 0) + 1
    counters[prefix] = next_count

    token = Token(
        tokenId=f'{prefix}-{next_count:03d}',
        patientName=payload.patientName,
        department=payload.department,
        urgency=payload.urgency,
        timestamp=int(datetime.utcnow().timestamp() * 1000),
    )

    _add_token(token)
    return TokenResponse(token=token)

@app.post('/api/call', response_model=TokenResponse)
def call_next(payload: dict) -> TokenResponse:
    department = payload.get('department')
    if not department:
        raise HTTPException(status_code=400, detail='Department is required.')

    token = _call_next(department)
    return TokenResponse(token=token)

@app.post('/api/skip', response_model=TokenResponse)
def skip_next(payload: dict) -> TokenResponse:
    department = payload.get('department')
    if not department:
        raise HTTPException(status_code=400, detail='Department is required.')

    token = _skip_next(department)
    return TokenResponse(token=token)

@app.post('/api/reinsert', response_model=ReinsertResponse)
def reinsert_token(payload: dict) -> ReinsertResponse:
    token_id = payload.get('tokenId')
    if not token_id:
        raise HTTPException(status_code=400, detail='tokenId is required.')

    success = _reinsert_pending(token_id)
    return ReinsertResponse(success=success)

@app.post('/api/reset-counters')
def reset_counters() -> None:
    counters.clear()

# Internal queue logic

def _add_token(token: Token) -> None:
    queue = queues.setdefault(token.department, [])
    if token.urgency == Urgency.NORMAL:
        queue.append(token)
        return

    insert_index = next(
        (index for index, queued in enumerate(queue) if queued.urgency == Urgency.NORMAL or queued.timestamp > token.timestamp),
        -1,
    )

    if insert_index == -1:
        queue.append(token)
    else:
        queue.insert(insert_index, token)


def _call_next(department: str) -> Optional[Token]:
    if not queues.get(department):
        return None
    return queues[department].pop(0)


def _skip_next(department: str) -> Optional[Token]:
    if not queues.get(department):
        return None
    token = queues[department].pop(0)
    pending_list.append(token)
    return token


def _reinsert_pending(token_id: str) -> bool:
    for index, token in enumerate(pending_list):
        if token.tokenId == token_id:
            pending = pending_list.pop(index)
            queue = queues.setdefault(pending.department, [])
            queue.insert(0, pending)
            return True
    return False
