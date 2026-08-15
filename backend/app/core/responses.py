from typing import Any
from fastapi.responses import JSONResponse


def success(data: Any = None, message: str = "Operation completed successfully", status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=jsonable_wrap({"success": True, "data": data, "message": message}),
    )


def jsonable_wrap(payload: dict) -> dict:
    from fastapi.encoders import jsonable_encoder
    return jsonable_encoder(payload)


class ApiError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
