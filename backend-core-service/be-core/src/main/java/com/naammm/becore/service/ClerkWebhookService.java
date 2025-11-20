package com.naammm.becore.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.naammm.becore.entity.User;
import com.naammm.becore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class ClerkWebhookService {

    private final UserRepository userRepository;

    @Transactional
    public void handleUserCreated(JsonNode userData) {
        try {
            String userId = userData.get("id").asText();
            
            // Check if user already exists
            if (userRepository.existsById(userId)) {
                log.info("User {} already exists, skipping creation", userId);
                return;
            }

            // Extract email from email_addresses array
            String email = extractPrimaryEmail(userData);
            String firstName = getTextOrNull(userData, "first_name");
            String lastName = getTextOrNull(userData, "last_name");
            String username = getTextOrNull(userData, "username");
            String imageUrl = getTextOrNull(userData, "image_url");

            User user = User.builder()
                    .id(userId)
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .username(username)
                    .imageUrl(imageUrl)
                    .build();

            userRepository.save(user);
            log.info("Created user: {} ({})", userId, email);

        } catch (Exception e) {
            log.error("Error handling user.created webhook", e);
            throw new RuntimeException("Failed to create user", e);
        }
    }

    @Transactional
    public void handleUserUpdated(JsonNode userData) {
        try {
            String userId = userData.get("id").asText();
            
            Optional<User> existingUser = userRepository.findById(userId);
            
            if (existingUser.isEmpty()) {
                log.warn("User {} not found for update, creating new", userId);
                handleUserCreated(userData);
                return;
            }

            User user = existingUser.get();
            
            // Update user fields
            String email = extractPrimaryEmail(userData);
            user.setEmail(email);
            user.setFirstName(getTextOrNull(userData, "first_name"));
            user.setLastName(getTextOrNull(userData, "last_name"));
            user.setUsername(getTextOrNull(userData, "username"));
            user.setImageUrl(getTextOrNull(userData, "image_url"));

            userRepository.save(user);
            log.info("Updated user: {} ({})", userId, email);

        } catch (Exception e) {
            log.error("Error handling user.updated webhook", e);
            throw new RuntimeException("Failed to update user", e);
        }
    }

    @Transactional
    public void handleUserDeleted(JsonNode userData) {
        try {
            String userId = userData.get("id").asText();
            
            if (userRepository.existsById(userId)) {
                userRepository.deleteById(userId);
                log.info("Deleted user: {}", userId);
            } else {
                log.warn("User {} not found for deletion", userId);
            }

        } catch (Exception e) {
            log.error("Error handling user.deleted webhook", e);
            throw new RuntimeException("Failed to delete user", e);
        }
    }

    private String extractPrimaryEmail(JsonNode userData) {
        JsonNode emailAddresses = userData.get("email_addresses");
        
        if (emailAddresses != null && emailAddresses.isArray() && emailAddresses.size() > 0) {
            // Find primary email or use first one
            for (JsonNode emailNode : emailAddresses) {
                JsonNode emailAddress = emailNode.get("email_address");
                if (emailAddress != null) {
                    return emailAddress.asText();
                }
            }
        }
        
        // Fallback
        JsonNode primaryEmail = userData.get("primary_email_address_id");
        if (primaryEmail != null) {
            return primaryEmail.asText();
        }
        
        return "unknown@example.com";
    }

    private String getTextOrNull(JsonNode node, String fieldName) {
        JsonNode field = node.get(fieldName);
        return (field != null && !field.isNull()) ? field.asText() : null;
    }
}
