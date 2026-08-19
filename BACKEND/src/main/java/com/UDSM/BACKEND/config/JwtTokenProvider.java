
package com.UDSM.BACKEND.config;

import java.security.Key;
import java.util.Date;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}")
    private String jwtSecret;
    @Value("${jwt.expiration}")
    private long jwtExpiration;
    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    public JwtTokenProvider() {
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(this.jwtSecret.getBytes());
    }

    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails)authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + this.jwtExpiration);
        return ((JwtBuilder)((JwtBuilder)((JwtBuilder)Jwts.builder().setSubject(userDetails.getUsername())).setIssuedAt(now)).setExpiration(expiryDate)).signWith(this.getSigningKey(), SignatureAlgorithm.HS256).compact();
    }

    public String generateRefreshToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails)authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + this.refreshExpiration);
        return ((JwtBuilder)((JwtBuilder)((JwtBuilder)Jwts.builder().setSubject(userDetails.getUsername())).setIssuedAt(now)).setExpiration(expiryDate)).signWith(this.getSigningKey(), SignatureAlgorithm.HS256).compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = (Claims)Jwts.parser().setSigningKey(this.getSigningKey()).build().parseClaimsJws(token).getBody();
        return claims.getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(this.getSigningKey()).build().parseClaimsJws(token);
            return true;
        } catch (Exception var3) {
            return false;
        }
    }
}
