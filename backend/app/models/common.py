from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str


class PaginationMeta(BaseModel):
    total: int
    limit: int
    offset: int
    has_more: bool
