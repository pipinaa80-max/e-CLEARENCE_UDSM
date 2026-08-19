
package com.UDSM.BACKEND.Repository;
import com.UDSM.BACKEND.Model.ERole;
import com.UDSM.BACKEND.Model.User;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    Optional<User> findByRegistrationNumber(String registrationNumber);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    List<User> findByRole(ERole role);

    List<User> findByIsActiveTrue();

    boolean existsByRegistrationNumber(@Size(
            max = 50,
            message = "Registration number must not exceed 50 characters"
    ) String registrationNumber);
}
