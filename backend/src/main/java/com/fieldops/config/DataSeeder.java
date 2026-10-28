package com.fieldops.config;

import com.fieldops.entity.Site;
import com.fieldops.entity.Ticket;
import com.fieldops.entity.TicketUpdate;
import com.fieldops.entity.User;
import com.fieldops.entity.enums.Category;
import com.fieldops.entity.enums.Priority;
import com.fieldops.entity.enums.Role;
import com.fieldops.entity.enums.Status;
import com.fieldops.repository.SiteRepository;
import com.fieldops.repository.TicketRepository;
import com.fieldops.repository.TicketUpdateRepository;
import com.fieldops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fills an empty database with demo data on startup. It runs in Java (not a .sql file)
 * so passwords go through the real BCrypt encoder. If any user already exists, it does nothing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "Password@123";

    private final UserRepository userRepository;
    private final SiteRepository siteRepository;
    private final TicketRepository ticketRepository;
    private final TicketUpdateRepository ticketUpdateRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        String hash = passwordEncoder.encode(DEMO_PASSWORD);
        User supervisor = userRepository.save(new User("Anita Deshmukh", "supervisor@fieldops.dev", hash, Role.SUPERVISOR, "9800000001"));
        User tech1 = userRepository.save(new User("Ravi Kumar", "tech1@fieldops.dev", hash, Role.TECHNICIAN, "9800000002"));
        User tech2 = userRepository.save(new User("Priya Sharma", "tech2@fieldops.dev", hash, Role.TECHNICIAN, "9800000003"));

        Site nagpur = site("NGP-01", "Central Station, Platform 3", "Nagpur", "21.152100", "79.088200");
        Site wardha = site("WR-01", "Wardha Junction, Main Concourse", "Wardha", "20.745700", "78.602700");
        Site ajni = site("AJ-01", "Ajni Station, Equipment Room", "Nagpur", "21.123500", "79.073900");
        Site badnera = site("BD-01", "Badnera Junction, Platform 1", "Amravati", "20.857500", "77.730200");
        Site chandrapur = site("CD-01", "Chandrapur Station, Waiting Hall", "Chandrapur", "19.954700", "79.301600");

        // 10 tickets: 4 for tech1, 4 for tech2, 2 still OPEN (unassigned).
        Ticket t1 = ticket("Wi-Fi down on Platform 3", "Access point not responding since 6 AM. Passengers reporting no signal.",
                Category.WIFI_DOWN, Priority.CRITICAL, Status.ASSIGNED, nagpur, tech1, supervisor);
        Ticket t2 = ticket("Fibre link down to Wardha", "Link between Wardha and Nagpur showing loss of signal.",
                Category.FIBRE_CUT, Priority.CRITICAL, Status.IN_PROGRESS, wardha, tech2, supervisor);
        Ticket t3 = ticket("UPS battery alarm in equipment room", "UPS showing low-battery alarm, running on mains only.",
                Category.POWER, Priority.HIGH, Status.IN_PROGRESS, ajni, tech1, supervisor);
        Ticket t4 = ticket("Switch port flapping", "Port 12 on the platform switch keeps going up and down.",
                Category.EQUIPMENT, Priority.HIGH, Status.ASSIGNED, badnera, tech2, supervisor);
        Ticket t5 = ticket("Slow Wi-Fi in waiting hall", "Speed tests below 2 Mbps during peak hours.",
                Category.WIFI_DOWN, Priority.HIGH, Status.RESOLVED, chandrapur, tech1, supervisor);
        ticket("CCTV network camera offline", "Camera near the foot overbridge not reachable on the network.",
                Category.EQUIPMENT, Priority.HIGH, Status.OPEN, nagpur, null, supervisor);
        ticket("Access point reboot loop", "AP in the booking office restarts every few minutes.",
                Category.WIFI_DOWN, Priority.MEDIUM, Status.ASSIGNED, wardha, tech1, supervisor);
        Ticket t8 = ticket("Power fluctuation at concourse router", "Router logs show repeated brown-outs.",
                Category.POWER, Priority.MEDIUM, Status.IN_PROGRESS, ajni, tech2, supervisor);
        Ticket t9 = ticket("Fibre patch panel damaged", "Patch panel door broken, two connectors loose.",
                Category.FIBRE_CUT, Priority.MEDIUM, Status.RESOLVED, badnera, tech2, supervisor);
        ticket("Label network cabinet", "Cabinet labels missing after last maintenance.",
                Category.OTHER, Priority.LOW, Status.OPEN, chandrapur, null, supervisor);

        // History rows, so tickets that have moved on show a timeline.
        history(t2, tech2, Status.ASSIGNED, Status.IN_PROGRESS, "Reached site, tracing the cut with OTDR", wardha, 3);
        history(t3, tech1, Status.ASSIGNED, Status.IN_PROGRESS, "Checking battery bank voltages", ajni, 2);
        history(t8, tech2, Status.ASSIGNED, Status.IN_PROGRESS, "Installing a line conditioner", ajni, 1);
        history(t5, tech1, Status.ASSIGNED, Status.IN_PROGRESS, "Found channel congestion, re-planning channels", chandrapur, 5);
        history(t5, tech1, Status.IN_PROGRESS, Status.RESOLVED, "Moved APs to clear channels. Speed test 40 Mbps.", chandrapur, 4);
        history(t9, tech2, Status.ASSIGNED, Status.IN_PROGRESS, "Ordered replacement panel door", badnera, 6);
        history(t9, tech2, Status.IN_PROGRESS, Status.RESOLVED, "Replaced door and re-terminated connectors", badnera, 5);
        t5.setResolvedAt(LocalDateTime.now().minusHours(4));
        t9.setResolvedAt(LocalDateTime.now().minusHours(5));

        log.info("Seeded demo data: 3 users, 5 sites, 10 tickets");
    }

    private Site site(String code, String name, String city, String lat, String lng) {
        return siteRepository.save(new Site(code, name, city, new BigDecimal(lat), new BigDecimal(lng)));
    }

    private Ticket ticket(String title, String description, Category category, Priority priority, Status status,
                          Site site, User assignedTo, User createdBy) {
        Ticket t = new Ticket();
        t.setTitle(title);
        t.setDescription(description);
        t.setCategory(category);
        t.setPriority(priority);
        t.setStatus(status);
        t.setSite(site);
        t.setAssignedTo(assignedTo);
        t.setCreatedBy(createdBy);
        t = ticketRepository.save(t);
        // The id only exists after saving, so the readable number is set afterwards (saved at commit).
        t.setTicketNo("FO-" + (1000 + t.getId()));
        return t;
    }

    private void history(Ticket ticket, User by, Status from, Status to, String note, Site at, int hoursAgo) {
        TicketUpdate u = new TicketUpdate();
        u.setTicket(ticket);
        u.setUpdatedBy(by);
        u.setFromStatus(from);
        u.setToStatus(to);
        u.setNote(note);
        u.setLatitude(at.getLatitude());
        u.setLongitude(at.getLongitude());
        u.setDeviceTime(LocalDateTime.now().minusHours(hoursAgo));
        ticketUpdateRepository.save(u);
    }
}
