package com.lasform.core.helper;

import com.lasform.core.model.dto.Response;
import com.lasform.core.model.dto.ResponseErrorPayload;
import org.springframework.http.ResponseEntity;

public class ResponseHelper {

    public static ResponseEntity prepareSuccess(Object payload ){
        return ResponseEntity.ok().body( payload );
    }

    public static String prepareStringSuccess( String payload ){
        return new Response( true , payload).toString();
    }

    public static ResponseEntity prepareError( int code , ResponseErrorPayload responseErrorPayload ){
        return ResponseEntity.status(code).body( responseErrorPayload );
    }

}
