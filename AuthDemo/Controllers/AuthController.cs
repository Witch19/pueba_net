using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using AuthDemo.Infrastructure.Data;
using AuthDemo.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text;

namespace AuthDemo.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest("Email y contraseña son obligatorios.");

            var email = req.Email.Trim();
            if (await _context.Users.AnyAsync(u => u.Email == email, cancellationToken))
                return Conflict("Ya existe una cuenta con ese email.");

            var user = new User
            {
                Email = email,
                Password = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role = "User"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            var token = CreateJwtToken(user);
            return StatusCode(StatusCodes.Status201Created, new
            {
                token,
                email = user.Email,
                role = user.Role
            });
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest req)
        {
            var user = _context.Users
                .FirstOrDefault(u => u.Email == req.Email);

            if (user == null || !TryVerifyAndUpgradePassword(user, req.Password))
                return Unauthorized("Usuario o contraseña incorrectos");

            var tokenString = CreateJwtToken(user);

            return Ok(new
            {
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

        /// <summary>Lista todos los usuarios de la base de datos (solo rol Admin). No incluye contraseñas.</summary>
        [Authorize(Policy = "AdminOnly")]
        [HttpGet("users")]
        public async Task<IActionResult> ListUsers(CancellationToken cancellationToken)
        {
            var users = await _context.Users
                .AsNoTracking()
                .OrderBy(u => u.Id)
                .Select(u => new UserListItem(u.Id, u.Email, u.Role))
                .ToListAsync(cancellationToken);

            return Ok(users);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost("users")]
        public async Task<IActionResult> CreateUser([FromBody] AdminUserCreateRequest req, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest("Email y contraseña son obligatorios.");

            var role = NormalizeRole(req.Role);
            if (role == null)
                return BadRequest("Rol inválido. Use Admin o User.");

            var email = req.Email.Trim();
            if (await _context.Users.AnyAsync(u => u.Email == email, cancellationToken))
                return Conflict("Ya existe un usuario con ese email.");

            var user = new User
            {
                Email = email,
                Password = BCrypt.Net.BCrypt.HashPassword(req.Password),
                Role = role
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            return StatusCode(StatusCodes.Status201Created, new UserListItem(user.Id, user.Email, user.Role));
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPut("users/{id:int}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] AdminUserUpdateRequest req, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
            if (user == null)
                return NotFound("Usuario no encontrado.");

            if (string.IsNullOrWhiteSpace(req.Email) && string.IsNullOrWhiteSpace(req.Role) && string.IsNullOrWhiteSpace(req.Password))
                return BadRequest("Indica al menos email, rol o contraseña a actualizar.");

            if (!string.IsNullOrWhiteSpace(req.Email))
            {
                var newEmail = req.Email.Trim();
                if (await _context.Users.AnyAsync(u => u.Email == newEmail && u.Id != id, cancellationToken))
                    return Conflict("Ya existe otro usuario con ese email.");
                user.Email = newEmail;
            }

            if (!string.IsNullOrWhiteSpace(req.Role))
            {
                var role = NormalizeRole(req.Role);
                if (role == null)
                    return BadRequest("Rol inválido. Use Admin o User.");

                if (user.Role == "Admin" && role == "User")
                {
                    var adminCount = await _context.Users.CountAsync(u => u.Role == "Admin", cancellationToken);
                    if (adminCount <= 1)
                        return BadRequest("No se puede quitar el rol Admin al único administrador.");
                }

                user.Role = role;
            }

            if (!string.IsNullOrWhiteSpace(req.Password))
                user.Password = BCrypt.Net.BCrypt.HashPassword(req.Password);

            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new UserListItem(user.Id, user.Email, user.Role));
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpDelete("users/{id:int}")]
        public async Task<IActionResult> DeleteUser(int id, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
            if (user == null)
                return NotFound("Usuario no encontrado.");

            var adminEmail = User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name;
            if (!string.IsNullOrEmpty(adminEmail) && string.Equals(user.Email, adminEmail, StringComparison.OrdinalIgnoreCase))
                return BadRequest("No puedes eliminar tu propia cuenta.");

            if (user.Role == "Admin")
            {
                var adminCount = await _context.Users.CountAsync(u => u.Role == "Admin", cancellationToken);
                if (adminCount <= 1)
                    return BadRequest("No se puede eliminar al único administrador.");
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync(cancellationToken);

            return NoContent();
        }

        private static string? NormalizeRole(string? role)
        {
            if (string.IsNullOrWhiteSpace(role))
                return "User";
            if (string.Equals(role.Trim(), "Admin", StringComparison.Ordinal))
                return "Admin";
            if (string.Equals(role.Trim(), "User", StringComparison.Ordinal))
                return "User";
            return null;
        }

        /// <summary>
        /// Acepta hash BCrypt
        /// </summary>
        private bool TryVerifyAndUpgradePassword(User user, string plainPassword)
        {
            try
            {
                if (BCrypt.Net.BCrypt.Verify(plainPassword, user.Password))
                    return true;
            }
            catch (BCrypt.Net.SaltParseException)
            {
            }

            if (user.Password != plainPassword)
                return false;

            user.Password = BCrypt.Net.BCrypt.HashPassword(plainPassword);
            _context.SaveChanges();
            return true;
        }

        private string CreateJwtToken(User user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Email),
                new Claim("role", user.Role)
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public record UserListItem(int Id, string Email, string Role);

    public class AdminUserCreateRequest
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string Role { get; set; } = "User";
    }

    public class AdminUserUpdateRequest
    {
        public string? Email { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
    }
}
