package com.lasform.core.business.exceptions;

public class BusinessException extends Exception  {

    private int businessExceptionCode = 0;

    public BusinessException() {
        super();
    }

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(String message,int businessExceptionCode) {
        super(message);
        this.businessExceptionCode = businessExceptionCode;
    }

    public int getBusinessExceptionCode() {
        return businessExceptionCode;
    }

    public void setBusinessExceptionCode(int businessExceptionCode) {
        this.businessExceptionCode = businessExceptionCode;
    }
}
