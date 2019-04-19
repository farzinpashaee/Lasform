package com.lasform.core.business.exceptions;

public class UnrecognizedLocationException extends BusinessException {

    public UnrecognizedLocationException(){
        super("Unrecognized Location Exception");
        setBusinessExceptionCode(1000);
    }

}