package com.UDSM.BACKEND.Repository;

import com.UDSM.BACKEND.Model.ERole;
import com.UDSM.BACKEND.Model.User;
import jakarta.validation.constraints.Size;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    // =========================================================
    // FIND BY FIELDS
    // =========================================================

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    Optional<User> findByRegistrationNumber(String registrationNumber);

    Optional<User> findByResetToken(String resetToken);

    Optional<User> findByVerificationToken(String verificationToken);

    Optional<User> findByIdAndIsActiveTrue(String id);

    // =========================================================
    // EXISTS CHECKS
    // =========================================================

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByRegistrationNumber(@Size(
            max = 50,
            message = "Registration number must not exceed 50 characters"
    ) String registrationNumber);

    boolean existsByEmailAndIsActiveTrue(String email);

    boolean existsByRegistrationNumberAndIsActiveTrue(String registrationNumber);

    // =========================================================
    // FIND BY ROLE AND STATUS
    // =========================================================

    List<User> findByRole(ERole role);

    List<User> findByIsActiveTrue();

    List<User> findByIsActiveFalse();

    List<User> findByIsEmailVerifiedFalse();

    List<User> findByIsLockedTrue();

    List<User> findByRoleAndIsActiveTrue(ERole role);

    List<User> findByRoleAndIsActiveFalse(ERole role);

    List<User> findByIsActiveTrueAndIsEmailVerifiedTrue();

    List<User> findByIsActiveTrueAndIsEmailVerifiedFalse();

    // =========================================================
    // FIND BY TOKENS WITH EXPIRY
    // =========================================================

    @Query("SELECT u FROM User u WHERE u.resetToken = :token AND u.resetTokenExpiry > :now")
    Optional<User> findByValidResetToken(@Param("token") String token, @Param("now") LocalDateTime now);

    @Query("SELECT u FROM User u WHERE u.verificationToken = :token AND u.verificationTokenExpiry > :now")
    Optional<User> findByValidVerificationToken(@Param("token") String token, @Param("now") LocalDateTime now);

    // =========================================================
    // FIND BY DATE RANGES
    // =========================================================

    List<User> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    List<User> findByLastLoginBetween(LocalDateTime startDate, LocalDateTime endDate);

    List<User> findByCreatedAtBefore(LocalDateTime date);

    List<User> findByCreatedAtAfter(LocalDateTime date);

    // =========================================================
    // FIND BY SEARCH TERMS
    // =========================================================

    @Query("SELECT u FROM User u WHERE " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.registrationNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.phoneNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<User> searchUsers(@Param("searchTerm") String searchTerm);

    @Query("SELECT u FROM User u WHERE " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
            "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "AND u.isActive = true")
    List<User> searchActiveUsers(@Param("searchTerm") String searchTerm);

    // =========================================================
    // COUNT METHODS
    // =========================================================

    long countByIsActiveTrue();

    long countByIsActiveFalse();

    long countByIsEmailVerifiedFalse();

    long countByIsLockedTrue();

    long countByRole(ERole role);

    long countByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :date")
    long countUsersRegisteredAfter(@Param("date") LocalDateTime date);

    @Query("SELECT COUNT(u) FROM User u WHERE u.lastLogin >= :date")
    long countUsersActiveAfter(@Param("date") LocalDateTime date);

    // =========================================================
    // UPDATE METHODS
    // =========================================================

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.lastLogin = :lastLogin, u.lastLoginIp = :ip, u.lastLoginDevice = :device WHERE u.id = :userId")
    int updateLastLoginInfo(@Param("userId") String userId,
                            @Param("lastLogin") LocalDateTime lastLogin,
                            @Param("ip") String ip,
                            @Param("device") String device);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isActive = :active, u.updatedAt = :updatedAt WHERE u.id = :userId")
    int updateAccountStatus(@Param("userId") String userId,
                            @Param("active") boolean active,
                            @Param("updatedAt") LocalDateTime updatedAt);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isLocked = :locked, u.lockReason = :reason, u.lockTime = :lockTime WHERE u.id = :userId")
    int updateAccountLockStatus(@Param("userId") String userId,
                                @Param("locked") boolean locked,
                                @Param("reason") String reason,
                                @Param("lockTime") LocalDateTime lockTime);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isEmailVerified = true, u.verificationToken = null, u.verificationTokenExpiry = null WHERE u.id = :userId")
    int verifyEmail(@Param("userId") String userId);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.password = :password, u.updatedAt = :updatedAt WHERE u.id = :userId")
    int updatePassword(@Param("userId") String userId,
                       @Param("password") String password,
                       @Param("updatedAt") LocalDateTime updatedAt);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.resetToken = :token, u.resetTokenExpiry = :expiry WHERE u.id = :userId")
    int updateResetToken(@Param("userId") String userId,
                         @Param("token") String token,
                         @Param("expiry") LocalDateTime expiry);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.verificationToken = :token, u.verificationTokenExpiry = :expiry WHERE u.id = :userId")
    int updateVerificationToken(@Param("userId") String userId,
                                @Param("token") String token,
                                @Param("expiry") LocalDateTime expiry);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.resetToken = null, u.resetTokenExpiry = null WHERE u.id = :userId")
    int clearResetToken(@Param("userId") String userId);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.verificationToken = null, u.verificationTokenExpiry = null WHERE u.id = :userId")
    int clearVerificationToken(@Param("userId") String userId);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isActive = false, u.updatedAt = :updatedAt WHERE u.createdAt < :date AND u.isActive = true")
    int deactivateInactiveUsers(@Param("date") LocalDateTime date,
                                @Param("updatedAt") LocalDateTime updatedAt);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isLocked = false, u.lockReason = null, u.lockTime = null WHERE u.isLocked = true AND u.lockTime < :date")
    int unlockExpiredLocks(@Param("date") LocalDateTime date);

    // =========================================================
    // FIND BY COMPLEX CONDITIONS
    // =========================================================

    @Query("SELECT u FROM User u WHERE u.role = :role AND u.isActive = :active AND u.isEmailVerified = :verified")
    List<User> findByRoleAndActiveAndVerified(@Param("role") ERole role,
                                              @Param("active") boolean active,
                                              @Param("verified") boolean verified);

    @Query("SELECT u FROM User u WHERE u.department = :department AND u.isActive = true")
    List<User> findActiveUsersByDepartment(@Param("department") String department);

    @Query("SELECT u FROM User u WHERE u.college = :college AND u.isActive = true")
    List<User> findActiveUsersByCollege(@Param("college") String college);

    @Query("SELECT u FROM User u WHERE u.programme = :programme AND u.isActive = true")
    List<User> findActiveUsersByProgramme(@Param("programme") String programme);

    // =========================================================
    // PAGINATION SUPPORT (if needed, add Pageable parameter)
    // =========================================================

    /*
    // Example with pagination:
    Page<User> findByIsActiveTrue(Pageable pageable);
    Page<User> findByRole(ERole role, Pageable pageable);
    Page<User> findByIsActiveTrueAndIsEmailVerifiedTrue(Pageable pageable);
    */

    // =========================================================
    // DELETE METHODS
    // =========================================================

    @Modifying
    @Transactional
    @Query("DELETE FROM User u WHERE u.isActive = false AND u.createdAt < :date")
    int deleteInactiveUsersOlderThan(@Param("date") LocalDateTime date);

    @Modifying
    @Transactional
    @Query("DELETE FROM User u WHERE u.isEmailVerified = false AND u.createdAt < :date")
    int deleteUnverifiedUsersOlderThan(@Param("date") LocalDateTime date);

    // =========================================================
    // SUMMARY STATISTICS
    // =========================================================

    @Query("SELECT new map(u.role as role, COUNT(u) as count) FROM User u GROUP BY u.role")
    List<Object[]> countUsersByRole();

    @Query("SELECT new map(u.department as department, COUNT(u) as count) FROM User u WHERE u.department IS NOT NULL GROUP BY u.department")
    List<Object[]> countUsersByDepartment();

    @Query("SELECT new map(u.college as college, COUNT(u) as count) FROM User u WHERE u.college IS NOT NULL GROUP BY u.college")
    List<Object[]> countUsersByCollege();

    @Query("SELECT new map(u.programme as programme, COUNT(u) as count) FROM User u WHERE u.programme IS NOT NULL GROUP BY u.programme")
    List<Object[]> countUsersByProgramme();

    // =========================================================
    // FIND RECENT USERS
    // =========================================================

    @Query("SELECT u FROM User u ORDER BY u.createdAt DESC")
    List<User> findRecentUsers();

    @Query("SELECT u FROM User u ORDER BY u.lastLogin DESC")
    List<User> findRecentLogins();

    @Query("SELECT u FROM User u WHERE u.isActive = true ORDER BY u.createdAt DESC")
    List<User> findRecentActiveUsers();

    // =========================================================
    // CHECK IF USER EXISTS BY CREDENTIALS
    // =========================================================

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE u.email = :email AND u.password = :password")
    boolean existsByEmailAndPassword(@Param("email") String email, @Param("password") String password);

    // =========================================================
    // FIND BY PARTIAL MATCH (for autocomplete)
    // =========================================================

    @Query("SELECT u.email FROM User u WHERE LOWER(u.email) LIKE LOWER(CONCAT(:prefix, '%')) AND u.isActive = true")
    List<String> findEmailsByPrefix(@Param("prefix") String prefix);

    @Query("SELECT u.registrationNumber FROM User u WHERE LOWER(u.registrationNumber) LIKE LOWER(CONCAT(:prefix, '%')) AND u.isActive = true")
    List<String> findRegistrationNumbersByPrefix(@Param("prefix") String prefix);

    // =========================================================
    // BULK OPERATIONS
    // =========================================================

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isActive = :active WHERE u.id IN :userIds")
    int bulkUpdateActiveStatus(@Param("userIds") List<String> userIds,
                               @Param("active") boolean active);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.isEmailVerified = :verified WHERE u.id IN :userIds")
    int bulkUpdateEmailVerification(@Param("userIds") List<String> userIds,
                                    @Param("verified") boolean verified);
}