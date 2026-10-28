package com.fieldops.repository;

import com.fieldops.entity.User;
import com.fieldops.entity.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByRoleOrderByNameAsc(Role role);
}
