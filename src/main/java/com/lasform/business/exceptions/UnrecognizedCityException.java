package com.lasform.business.exceptions;

public class UnrecognizedCityException extends BusinessException {

    public UnrecognizedCityException(){
        super("Unrecognized City Exception");
        setBusinessExceptionCode(1002);
    }

}
