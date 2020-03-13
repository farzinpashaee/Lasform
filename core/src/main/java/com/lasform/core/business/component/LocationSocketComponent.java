package com.lasform.core.business.component;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

import javax.annotation.PostConstruct;

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

	@PostConstruct
	public void initLocationSocketService() throws IOException {

		new Thread(new Runnable() {
			public void run() {
				try {
					System.out.println(socketServiceProperties.getPort());
					server = new ServerSocket(socketServiceProperties.getPort());
					while (true) {
						try {
							Socket socket = server.accept();
							executor.execute(new LocationProcessSocketRunner(socket));
						} catch (Exception e) {
							System.out.println("ERROR: " + e.getMessage());
						}
					}
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}).start();

	}

}
