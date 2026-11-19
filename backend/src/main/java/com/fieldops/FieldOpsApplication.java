package com.fieldops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class FieldOpsApplication {

	public static void main(String[] args) {
		/*
		 * Fix the app's time zone to India, whatever machine it runs on.
		 * - Windows reports the old name "Asia/Calcutta", which PostgreSQL rejects when connecting.
		 * - Cloud servers (Render) run on UTC, which would make "resolved today" start at 5:30 AM IST.
		 * Must run before Spring opens any database connection. Tests don't call main(),
		 * so pom.xml passes the same setting to the test runner (-Duser.timezone).
		 */
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
		SpringApplication.run(FieldOpsApplication.class, args);
	}

}
