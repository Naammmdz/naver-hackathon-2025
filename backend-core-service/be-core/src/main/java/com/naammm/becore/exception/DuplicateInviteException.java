package com.naammm.becore.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateInviteException extends RuntimeException {

    public DuplicateInviteException(String message) {
        super(message);
    }
}
