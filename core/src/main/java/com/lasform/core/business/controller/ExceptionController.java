package com.lasform.core.business.controller;

import com.lasform.core.business.exceptions.*;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.ResponseErrorPayload;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class ExceptionController {

    @ExceptionHandler(value = BusinessException.class)
    public ResponseEntity businessException(BusinessException exception){
        return ResponseHelper.prepareError( HttpStatus.INTERNAL_SERVER_ERROR.value() ,
                new ResponseErrorPayload(exception.getBusinessExceptionCode() , exception.getMessage() ) );
    }

    @ExceptionHandler(value = EmptyFieldException.class)
    public ResponseEntity emptyFiledException(EmptyFieldException exception){
        return ResponseHelper.prepareError( HttpStatus.INTERNAL_SERVER_ERROR.value() ,
                new ResponseErrorPayload(exception.getBusinessExceptionCode() , exception.getMessage() ) );
    }

    @ExceptionHandler(value = UnrecognizedLocationTypeException.class)
    public ResponseEntity unrecognizedLocationTypeException(UnrecognizedLocationTypeException exception){
        return ResponseHelper.prepareError( HttpStatus.INTERNAL_SERVER_ERROR.value() ,
                new ResponseErrorPayload(exception.getBusinessExceptionCode() , exception.getMessage() ) );
    }

    @ExceptionHandler(value = UnrecognizedCityException.class)
    public ResponseEntity unrecognizedCityException(UnrecognizedCityException exception){
        return ResponseHelper.prepareError( HttpStatus.INTERNAL_SERVER_ERROR.value() ,
                new ResponseErrorPayload(exception.getBusinessExceptionCode() , exception.getMessage() ) );
    }

    @ExceptionHandler(value = NativeQueryException.class)
    public ResponseEntity nativeQueryExceptionException(NativeQueryException exception){
        return ResponseHelper.prepareError( HttpStatus.INTERNAL_SERVER_ERROR.value() ,
                new ResponseErrorPayload(0 , exception.getMessage() ) );
    }

}
