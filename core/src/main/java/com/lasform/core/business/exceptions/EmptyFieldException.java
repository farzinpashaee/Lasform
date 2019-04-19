package com.lasform.core.business.exceptions;

public class EmptyFieldException extends BusinessException {

    public EmptyFieldException(){
        super("Empty Field Exception");
        setBusinessExceptionCode(1003);
    }

    public EmptyFieldException( String message ){
        super(message);
        setBusinessExceptionCode(1003);
    }

}