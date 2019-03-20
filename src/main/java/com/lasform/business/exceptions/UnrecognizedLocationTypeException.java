package com.lasform.business.exceptions;

public class UnrecognizedLocationTypeException extends BusinessException {

    public UnrecognizedLocationTypeException(){
        super("Unrecognized City Exception");
        setBusinessExceptionCode(10001);
    }

}
