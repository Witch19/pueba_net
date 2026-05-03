using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using AuthDemo.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Linq;
using System.Text;

namespace AuthDemo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest req)
        {
            var user = _context.Users
                .FirstOrDefault(u => u.Email == req.Email && u.Password == req.Password);

            if (user == null)
                return Unauthorized("Usuario o contraseña incorrectos");

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Email),
                new Claim("role", user.Role)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"])
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"], 
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: creds
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            return Ok(new {
                token = tokenString,
                email = user.Email,
                role = user.Role
            });
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpGet("admin")]
        public IActionResult SoloAdmin()
        {
            return Ok("Bienvenido Admin");
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}