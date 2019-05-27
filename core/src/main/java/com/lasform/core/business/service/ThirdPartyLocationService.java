package com.lasform.core.business.service;

import com.lasform.core.model.dto.DirectionRequest;
import org.springframework.web.bind.annotation.RequestBody;

public interface ThirdPartyLocationService {
    String getBaseApi();
    String getDirection(@RequestBody DirectionRequest directionRequest);
}
