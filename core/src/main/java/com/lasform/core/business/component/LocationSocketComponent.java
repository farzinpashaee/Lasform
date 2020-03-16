package com.lasform.core.business.component;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

import javax.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;

import com.lasform.core.business.service.implementation.LocationProcessSocketRunner;
import com.lasform.core.config.properties.SocketServiceProperties;

@Component
public class LocationSocketComponent {
	
	@Autowired
	SocketServiceProperties socketServiceProperties;

	@Autowired
	TaskExecutor executor;

	public static ServerSocket server;
	private static final Logger log = LoggerFactory.getLogger(LocationSocketComponent.class);

	@PostConstruct
	public void initLocationSocketService() throws IOException {

		if( socketServiceProperties.isEnable() ){
			new Thread(new Runnable() {
				public void run() {
					try {
						log.info("Starting socket service on port " + socketServiceProperties.getPort());
						server = new ServerSocket(socketServiceProperties.getPort());
						while (true) {
							try {
								Socket socket = server.accept();
								executor.execute(new LocationProcessSocketRunner(socket));
							} catch (Exception e) {
								log.error(e.getMessage());
							}
						}
					} catch (IOException e) {
						e.printStackTrace();
					}
				}
			}).start();
		}
		
	}

}
