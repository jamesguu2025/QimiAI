import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getClientIp, getPayloadSizeBytes, rejectIfRateLimited } from '@/lib/rate-limit';

const MAX_PAYLOAD_BYTES = 4 * 1024;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (getPayloadSizeBytes(req) > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: '请求内容过大' });
  }

  if (rejectIfRateLimited(req, res, {
    namespace: 'signup',
    key: getClientIp(req),
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })) return;

  const { email, password, name } = req.body;

  // 验证输入
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail.length > 254 || !emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: '请输入有效的邮箱地址' });
  }

  // 验证密码强度
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: '密码长度需要在8到128个字符之间' });
  }

  const normalizedName = typeof name === 'string' ? name.trim().slice(0, 100) : '';

  try {
    const supabase = getSupabaseAdmin();
    // 检查邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已注册，请登录或使用原注册方式' });
    }

    // 哈希密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        name: normalizedName || null,
        password_hash: passwordHash,
        provider: 'email',
      })
      .select('id, email, name')
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({ error: '注册失败，请稍后重试' });
    }

    return res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: '服务器错误，请稍后重试' });
  }
}
