package com.lasform.core.business.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.lasform.core.business.exceptions.BusinessException;
import com.lasform.core.business.exceptions.EmptyFieldException;
import com.lasform.core.business.exceptions.NativeQueryException;
import com.lasform.core.business.exceptions.UnrecognizedCityException;
import com.lasform.core.business.exceptions.UnrecognizedLocationTypeException;
import com.lasform.core.helper.ResponseHelper;
import com.lasform.core.model.dto.ResponseErrorPayload;

@ControllerAdvice
public class ExceptionController {

	@ExceptionHandler(value = BusinessException.class)
	public ResponseEntity<ResponseErrorPayload> businessException(BusinessException exception) {
		return ResponseHelper.prepareError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
				new ResponseErrorPayload(exception.getBusinessExceptionCode(), exception.getMessage()));
	}

	@ExceptionHandler(value = EmptyFieldException.class)
	public ResponseEntity<ResponseErrorPayload> emptyFiledException(EmptyFieldException exception) {
		return ResponseHelper.prepareError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
				new ResponseErrorPayload(exception.getBusinessExceptionCode(), exception.getMessage()));
	}

	@ExceptionHandler(value = UnrecognizedLocationTypeException.class)
	public ResponseEntity<ResponseErrorPayload> unrecognizedLocationTypeException(
			UnrecognizedLocationTypeException exception) {
		return ResponseHelper.prepareError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
				new ResponseErrorPayload(exception.getBusinessExceptionCode(), exception.getMessage()));
	}

	@ExceptionHandler(value = UnrecognizedCityException.class)
	public ResponseEntity<ResponseErrorPayload> unrecognizedCityException(UnrecognizedCityException exception) {
		return ResponseHelper.prepareError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
				new ResponseErrorPayload(exception.getBusinessExceptionCode(), exception.getMessage()));
	}

	@ExceptionHandler(value = NativeQueryException.class)
	public ResponseEntity<ResponseErrorPayload> nativeQueryExceptionException(NativeQueryException exception) {
		return ResponseHelper.prepareError(HttpStatus.INTERNAL_SERVER_ERROR.value(),
				new ResponseErrorPayload(0, exception.getMessage()));
	}

}
