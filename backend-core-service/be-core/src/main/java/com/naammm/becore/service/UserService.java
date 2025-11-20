package com.naammm.becore.service;

import com.naammm.becore.entity.User;
import com.naammm.becore.repository.UserRepository;
import com.naammm.becore.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public User getOrCreateUser() {
        String userId = UserContext.getUserId();
        String email = UserContext.getEmail();

        if (userId == null || email == null) {
            throw new IllegalStateException("User ID and Email must be present in JWT token");
        }

        return userRepository.findById(userId)
                .orElseGet(() -> createUserFromContext(userId, email));
    }

    private User createUserFromContext(String userId, String email) {
        log.info("Creating new user: {} with email: {}", userId, email);

        User user = User.builder()
                .id(userId)
                .email(email)
                .username(UserContext.getUsername())
                .firstName(UserContext.getFirstName())
                .lastName(UserContext.getLastName())
                .build();

        return userRepository.save(user);
    }

    public Optional<User> findById(String userId) {
        return userRepository.findById(userId);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
