package com.lasform.core.business.component;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

import javax.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;

import com.lasform.core.business.service.implementation.LocationProcessSocketRunner;

@Component
public class LocationSocketComponent {

	@Autowired
	TaskExecutor executor;

	public static ServerSocket server;

	@PostConstruct
	public void initLocationSocketService() throws IOException {

		new Thread(new Runnable() {
			public void run() {
				try {
					server = new ServerSocket(8089);
					while (true) {
						try {
							Socket socket = server.accept();

							executor.execute(new LocationProcessSocketRunner(socket));
						} catch (Exception e) {
							System.out.println("ERROR:" + e.getMessage());
						}
					}
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}).start();

	}

}
