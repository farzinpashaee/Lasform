package com.lasform.core.business.service.implementation;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.Socket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.lasform.core.business.component.LocationSocketComponent;
import com.lasform.core.config.LasformSocketServiceConfig;
import com.lasform.core.config.properties.SocketServiceProperties;

public class LocationProcessSocketRunner implements Runnable {

	@Autowired
	SocketServiceProperties threadPoolProperties;

	protected Socket clientSocket = null;
	private static final Logger log = LoggerFactory.getLogger(LocationSocketComponent.class);

	public LocationProcessSocketRunner(Socket clientSocket) {
		this.clientSocket = clientSocket;
	}

	@Override
	public void run() {
		try {
			InputStreamReader streamReader = new InputStreamReader(clientSocket.getInputStream());
			BufferedReader reader = new BufferedReader(streamReader);

			clientSocket.setSoTimeout(2000);
			StringBuilder data = new StringBuilder();
			StringBuilder length = new StringBuilder();
			StringBuilder sourceIdentifier = new StringBuilder();
			StringBuilder type = new StringBuilder();

			int ch, counter = 0, dataCounter = 0;
			while ((ch = reader.read()) != -1) {
				counter++;
				if (ch == 59)
					break;

				if (counter <= LasformSocketServiceConfig.TYPE_TAG_SIZE) {
					type.append((char) ch);
				} else if (counter > LasformSocketServiceConfig.TYPE_TAG_SIZE
						&& counter <= LasformSocketServiceConfig.LENGTH_TAG_END_INDEX) {
					length.append((char) ch);
				} else if (counter > LasformSocketServiceConfig.LENGTH_TAG_END_INDEX
						&& counter <= LasformSocketServiceConfig.IDENTIFIER_TAG_END_INDEX) {
					sourceIdentifier.append((char) ch);
				} else {
					dataCounter++;
					if (type.toString().equals("01")) {
						data.append((char) ch);
						if (dataCounter == LasformSocketServiceConfig.LOCATION_SERIES_DATA_SEGMENT_LENGTH ) {
							String message = data.toString();
							log.info(message);
							data.setLength(0);
							dataCounter = 0;
						}
					}
				}
			}

			log.info("sourceIdentifier: " + sourceIdentifier + " type: " + type + ", length: " + length);
			data = null;
			length = null;
			sourceIdentifier = null;
			type = null;

			reader.close();
			clientSocket.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

}
