package com.lasform.business.exceptions;

public class UnrecognizedLocationException extends BusinessException {

    public UnrecognizedLocationException(){
        super("Unrecognized Location Exception");
        setBusinessExceptionCode(1000);
    }

}