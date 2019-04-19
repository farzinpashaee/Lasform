package com.lasform.core.helper;

import com.lasform.core.model.dto.Response;
import com.lasform.core.model.dto.ResponseErrorPayload;

public class ResponseHelper {

    public static Response prepareSuccess( Object payload ){
        return new Response( true , payload );
    }

    public static String prepareStringSuccess( String payload ){
        return new Response( true , payload).toString();
    }

    public static Response prepareError( int code , String description ){
        return new Response( false , new ResponseErrorPayload( code , description ) );
    }

}
