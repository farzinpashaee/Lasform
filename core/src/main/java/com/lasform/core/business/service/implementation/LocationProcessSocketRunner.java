package com.lasform.core.business.service.implementation;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.Socket;

public class LocationProcessSocketRunner implements Runnable {

	protected Socket clientSocket = null;

	public LocationProcessSocketRunner(Socket clientSocket) {
		this.clientSocket = clientSocket;
	}

	@Override
	public void run() {
		try {
			InputStreamReader streamReader = new InputStreamReader(clientSocket.getInputStream());
			BufferedReader reader = new BufferedReader(streamReader);

			clientSocket.setSoTimeout(2000);
			StringBuilder sb = new StringBuilder();
			int ch;
			System.out.println("client port: " + clientSocket.getPort());
			while ((ch = reader.read()) != -1) {
				if (ch == 88) break;
				if (ch == 124) {
					if (sb.length() == 10) {
						System.out.println("Location Token: " + sb.toString());
					} else {
						System.out.println("Invalid location token:" + sb.toString());
					}
					sb.setLength(0);
				} else {
					sb.append((char) ch);
				}
			}
			System.out.println("closing socket" + sb.toString());
			reader.close();
			clientSocket.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

}
