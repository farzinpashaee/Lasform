package com.lasform.core.config;

public class LasformSecurityConfig { // extends WebSecurityConfigurerAdapter {

}

/*
 * @Configuration
 * 
 * @EnableWebSecurity public class LasformSecurityConfig extends
 * WebSecurityConfigurerAdapter {
 * 
 * @Override protected void configure(HttpSecurity http) throws Exception {
 * http.authorizeRequests().antMatchers("/**").permitAll().antMatchers(
 * "/api/location/**").permitAll()
 * .antMatchers("/manage/**").hasRole("USER").anyRequest().authenticated().and()
 * .formLogin() .loginPage("/login").permitAll().and().logout().permitAll();
 * http.csrf().disable(); }
 * 
 * }
 */
